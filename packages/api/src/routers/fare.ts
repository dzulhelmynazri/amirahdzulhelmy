import { normalizeRoutings } from "@atlas/atlas-client/fare-compare/normalize";
import type { NormalizedFare } from "@atlas/atlas-client/fare-compare/types";
import { db } from "@atlas/db";
import { fareSearch, savedFare } from "@atlas/db/schema/fares";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { getAtlasClient } from "../lib/atlas";
import { parseFareQuery } from "../lib/fare-parse";

/** Atlas convention: status 0 on a response means the request succeeded. */
const ATLAS_STATUS_OK = 0;

const SEARCH_TIMEOUT_MS = 45_000;
const MAX_ADULTS = 9;
const MAX_CHILDREN = 8;
const RECENT_SCAN_LIMIT = 30;
const RECENT_SHOWN = 4;
const POPULAR_LIMIT = 6;

const IATA_PATTERN = /^[A-Z]{3}$/u;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const DATE_SEPARATOR = /-/gu;

/**
 * Atlas status codes rewritten for travellers. The raw strings are written for
 * integrators ("Currency not supported for settlement") and must not reach the
 * client. Anything unmapped falls back to a generic line — never the raw `msg`.
 */
const USER_FACING_ERRORS: Record<number, string> = {
  105: "We do not sell this route yet.",
  106: "Search is not available for this route right now.",
  107: "This account cannot search right now. Please contact support.",
  108: "This route is restricted.",
  109: "We have hit today's search limit. Please try again tomorrow.",
  110: "Too many searches at once. Wait a moment and try again.",
  111: "Live pricing is not available for this route.",
  112: "The airline took too long to respond. Please try again.",
  113: "The airline's system is under maintenance. Try again later.",
  124: "Fare search is misconfigured on our side. We are on it.",
  900: "We could not authenticate with the fare provider.",
  9999: "The fare provider had an internal error. Please try again.",
};

const GENERIC_ERROR = "We could not fetch fares right now. Please try again.";

/** Human wording for an empty result, keyed by Atlas's `noResultReason.code`. */
const NO_RESULT_MESSAGES: Record<string, string> = {
  AIRLINE_NO_FLIGHT: "No airline flies this route on that date.",
  FLIGHT_SOLD_OUT: "Every flight on this date is sold out.",
  PRICE_FETCH_FAILED: "We reached the airlines but could not price this route.",
  ROUTE_NOT_SUPPORTED: "We do not have fares for this route yet.",
};

const iata = (label: string) =>
  z.string().regex(IATA_PATTERN, `${label} must be a 3-letter airport code.`);

const isoDate = (label: string) =>
  z.string().regex(ISO_DATE_PATTERN, `${label} is invalid.`);

const searchInputSchema = z
  .object({
    adults: z
      .number()
      .int()
      .min(1, `Adults must be between 1 and ${MAX_ADULTS}.`)
      .max(MAX_ADULTS, `Adults must be between 1 and ${MAX_ADULTS}.`),
    cabin: z.string().min(1),
    children: z
      .number()
      .int()
      .min(0, `Children must be between 0 and ${MAX_CHILDREN}.`)
      .max(MAX_CHILDREN, `Children must be between 0 and ${MAX_CHILDREN}.`),
    currency: z.string().length(3),
    departureDate: isoDate("Departure date"),
    destination: iata("Destination"),
    infants: z.number().int().min(0),
    origin: iata("Origin"),
    returnDate: isoDate("Return date").optional(),
  })
  .refine((input) => input.origin !== input.destination, {
    message: "Origin and destination must be different.",
    path: ["destination"],
  })
  .refine((input) => input.infants <= input.adults, {
    message: "Infants cannot outnumber adults.",
    path: ["infants"],
  });

type SearchInput = z.infer<typeof searchInputSchema>;

const saveInputSchema = z.object({
  airline: z.string().min(1).max(8),
  baggageIncluded: z.boolean(),
  cabin: z.string().min(1).optional(),
  currency: z.string().length(3),
  flightNumbers: z.string().min(1).max(200),
  priceAtSave: z.string().min(1),
  routingIdentifier: z.string().min(1).optional(),
  searchId: z.string().uuid().optional(),
  stops: z.number().int().min(0).max(20),
});

export interface FareSearchOutcome {
  error?: string;
  fares: NormalizedFare[];
  /** Nearby dates Atlas says do have flights, when this one has none. */
  nearbyDates?: string[];
  /** Why nothing came back, in plain language. */
  noResultMessage?: string;
  /** Atlas request id, worth surfacing when raising a support ticket. */
  requestId?: string;
  /** Row id in `fare_search`, so a fare can be saved against this search. */
  searchId?: string;
}

export interface NearbyDatePrice {
  /** `YYYY-MM-DD` the outbound leg departs. */
  date: string;
  cheapestTotal?: number;
  currency?: string;
  /** False when Atlas returned no fares for that day. */
  hasFares: boolean;
  /** True for the date the traveller originally searched. */
  isCurrent: boolean;
  returnDate?: string;
}

interface SearchApiResponse {
  msg?: string | null;
  noResultReason?: unknown;
  requestId?: unknown;
  routings?: unknown;
  status?: unknown;
}

const toCompactDate = (value: string) => value.replace(DATE_SEPARATOR, "");

const isoFromCompact = (value: string) =>
  value.length === 8
    ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
    : value;

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

/** The documented `/search.do` body, kept out of the handler for readability. */
const toSearchBody = (
  input: SearchInput,
  departureDate: string,
  returnDate: string | undefined
) => ({
  adultNum: input.adults,
  cabinClass: input.cabin,
  childNum: input.children,
  currency: input.currency,
  fromCity: input.origin,
  fromDate: departureDate,
  infantNum: input.infants,
  toCity: input.destination,
  tripType: returnDate === undefined ? "1" : "2",
  ...(returnDate === undefined ? {} : { retDate: returnDate }),
});

/**
 * Logs the search criteria and result count. Best-effort: a logging failure
 * must never cost the traveller their results, so it is swallowed.
 */
const recordSearch = async (
  userId: string,
  input: SearchInput,
  resultCount: number,
  requestId: string | undefined
): Promise<string | undefined> => {
  const id = crypto.randomUUID();

  try {
    await db.insert(fareSearch).values({
      adults: input.adults,
      cabin: input.cabin,
      children: input.children,
      currency: input.currency,
      departureDate: input.departureDate,
      destination: input.destination,
      id,
      infants: input.infants,
      origin: input.origin,
      resultCount,
      tripType: input.returnDate === undefined ? "one-way" : "round-trip",
      userId,
      ...(input.returnDate === undefined
        ? {}
        : { returnDate: input.returnDate }),
      ...(requestId === undefined ? {} : { requestId }),
    });
    return id;
  } catch {
    return undefined;
  }
};

/**
 * Empty is not an error. Atlas often names the reason and offers nearby dates
 * that do have flights — far more useful than a bare "no results".
 */
const emptyOutcome = (rawReason: unknown): FareSearchOutcome => {
  const reason = asRecord(rawReason);
  const code = typeof reason?.code === "string" ? reason.code : undefined;
  const nearbyDates = Array.isArray(reason?.recentFlightDates)
    ? reason.recentFlightDates
        .filter((date): date is string => typeof date === "string")
        .map(isoFromCompact)
    : [];

  return {
    fares: [],
    noResultMessage:
      (code === undefined ? undefined : NO_RESULT_MESSAGES[code]) ??
      "No flights found for these dates.",
    ...(nearbyDates.length === 0 ? {} : { nearbyDates }),
  };
};

/**
 * @param shouldRecord Set false for exploratory searches that should not
 * pollute the traveller's history.
 */
const runSearch = async (
  userId: string,
  input: SearchInput,
  shouldRecord = true
): Promise<FareSearchOutcome> => {
  const atlas = await getAtlasClient();
  const departureDate = toCompactDate(input.departureDate);
  const returnDate =
    input.returnDate === undefined
      ? undefined
      : toCompactDate(input.returnDate);

  let response: SearchApiResponse;

  try {
    // `/search.do` is the booking-flow search. `/priceCompareSearch.do` is
    // reserved for pre-sales benchmarking and must not price this page.
    response = await atlas.client.post<SearchApiResponse>(
      "/search.do",
      toSearchBody(input, departureDate, returnDate),
      { timeoutMs: SEARCH_TIMEOUT_MS }
    );
  } catch {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: GENERIC_ERROR,
    });
  }

  if (typeof response.status !== "number") {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: GENERIC_ERROR,
    });
  }

  const requestId =
    typeof response.requestId === "string" ? response.requestId : undefined;

  // Atlas signals business errors with a non-zero status inside an HTTP 200.
  // Returned (not thrown) so the page can still show `requestId`.
  if (response.status !== ATLAS_STATUS_OK) {
    console.error("Atlas search failed", {
      requestId,
      status: response.status,
    });

    return {
      error: USER_FACING_ERRORS[response.status] ?? GENERIC_ERROR,
      fares: [],
      ...(requestId === undefined ? {} : { requestId }),
    };
  }

  const fares = normalizeRoutings(response.routings, {
    airlines: [],
    currency: input.currency,
    departureDate,
    destination: input.destination,
    id: `${input.origin}-${input.destination}`,
    origin: input.origin,
    passengers: {
      adults: input.adults,
      children: input.children,
      infants: input.infants,
    },
    ...(returnDate === undefined ? {} : { returnDate }),
  });

  const searchId = shouldRecord
    ? await recordSearch(userId, input, fares.length, requestId)
    : undefined;

  if (fares.length > 0) {
    return {
      fares,
      ...(searchId === undefined ? {} : { searchId }),
      ...(requestId === undefined ? {} : { requestId }),
    };
  }

  return {
    ...emptyOutcome(response.noResultReason),
    ...(searchId === undefined ? {} : { searchId }),
    ...(requestId === undefined ? {} : { requestId }),
  };
};

/** ±3 days is a week-wide view: enough to see a pattern, cheap enough to run. */
const NEARBY_SPREAD = 3;
const NEARBY_CONCURRENCY = 3;
const MS_PER_DAY = 86_400_000;

const shiftIsoDate = (value: string, days: number): string => {
  const shifted = new Date(`${value}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
};

const cheapestOf = (fares: NormalizedFare[]) => {
  let best: NormalizedFare | undefined;

  for (const fare of fares) {
    if (best === undefined || fare.adultTotal < best.adultTotal) {
      best = fare;
    }
  }

  return best;
};

/**
 * Prices the days either side of the chosen departure.
 *
 * Dates are the biggest lever on airfare, and a single price answers nothing —
 * "USD 103" only means something next to its neighbours. Round trips shift both
 * legs together so the trip length stays what the traveller asked for.
 *
 * Costs one Atlas search per day, so this is opt-in rather than automatic, and
 * these searches are deliberately not written to `fare_search`: they are the
 * page exploring, not the traveller.
 */
const searchNearbyDates = async (
  userId: string,
  input: SearchInput
): Promise<NearbyDatePrice[]> => {
  const tripLengthDays =
    input.returnDate === undefined
      ? undefined
      : Math.round(
          (Date.parse(`${input.returnDate}T00:00:00Z`) -
            Date.parse(`${input.departureDate}T00:00:00Z`)) /
            MS_PER_DAY
        );

  const offsets = Array.from(
    { length: NEARBY_SPREAD * 2 + 1 },
    (_, index) => index - NEARBY_SPREAD
  );

  const today = new Date().toISOString().slice(0, 10);
  const candidates = offsets
    .map((offset) => shiftIsoDate(input.departureDate, offset))
    .filter((date) => date >= today);

  const results: NearbyDatePrice[] = [];
  let cursor = 0;

  const worker = async (): Promise<void> => {
    while (cursor < candidates.length) {
      const date = candidates[cursor];
      cursor += 1;

      if (date === undefined) {
        return;
      }

      const returnDate =
        tripLengthDays === undefined
          ? undefined
          : shiftIsoDate(date, tripLengthDays);

      // One bad day must not cost the traveller the other six, so a failed
      // search is read as "no fares" rather than thrown.
      // oxlint-disable-next-line eslint/no-await-in-loop
      const outcome = await runSearch(
        userId,
        {
          ...input,
          departureDate: date,
          ...(returnDate === undefined ? {} : { returnDate }),
        },
        false
      ).catch((): FareSearchOutcome => ({ fares: [] }));

      const cheapest = cheapestOf(outcome.fares);

      results.push({
        date,
        hasFares: outcome.fares.length > 0,
        isCurrent: date === input.departureDate,
        ...(cheapest === undefined
          ? {}
          : {
              cheapestTotal: cheapest.adultTotal,
              currency: cheapest.currency,
            }),
        ...(returnDate === undefined ? {} : { returnDate }),
      });
    }
  };

  await Promise.all(
    Array.from(
      { length: Math.min(NEARBY_CONCURRENCY, candidates.length) },
      () => worker()
    )
  );

  return results.toSorted((a, b) => a.date.localeCompare(b.date));
};

const savedFareRouter = router({
  /**
   * Saving a fare stores a **snapshot**, not a bookable offer. Atlas expires
   * `routingIdentifier`, so a saved row goes stale — re-search and verify
   * before anyone tries to buy it.
   */
  create: protectedProcedure
    .input(saveInputSchema)
    .mutation(async ({ ctx, input }) => {
      const id = crypto.randomUUID();

      try {
        const [row] = await db
          .insert(savedFare)
          .values({
            airline: input.airline,
            baggageIncluded: input.baggageIncluded,
            currency: input.currency,
            flightNumbers: input.flightNumbers,
            id,
            priceAtSave: input.priceAtSave,
            stops: input.stops,
            userId: ctx.session.user.id,
            ...(input.cabin === undefined ? {} : { cabin: input.cabin }),
            ...(input.routingIdentifier === undefined
              ? {}
              : { routingIdentifier: input.routingIdentifier }),
            ...(input.searchId === undefined
              ? {}
              : { searchId: input.searchId }),
          })
          .returning();

        if (!row) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not save that fare. Please try again.",
          });
        }

        return row;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not save that fare. Please try again.",
        });
      }
    }),

  list: protectedProcedure.query(({ ctx }) =>
    db
      .select()
      .from(savedFare)
      .where(eq(savedFare.userId, ctx.session.user.id))
      .orderBy(desc(savedFare.createdAt))
  ),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Scoped to the owner so an id alone cannot delete someone else's row.
      const [row] = await db
        .delete(savedFare)
        .where(
          and(
            eq(savedFare.id, input.id),
            eq(savedFare.userId, ctx.session.user.id)
          )
        )
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Could not remove that fare.",
        });
      }

      return row;
    }),
});

export const fareRouter = router({
  /**
   * Prices the days around the chosen departure. Mutation for the same reason
   * `search` is one: it spends Atlas quota, several searches' worth, and must
   * only ever run when the traveller asks for it.
   */
  nearbyDates: protectedProcedure
    .input(searchInputSchema)
    .mutation(({ ctx, input }) =>
      searchNearbyDates(ctx.session.user.id, input)
    ),

  /**
   * The AI mode of the /fares page: freeform text in, search criteria out.
   * Parsing costs a small model call, not Atlas quota — the client decides
   * whether to actually run the search with what came back.
   */
  parse: protectedProcedure
    .input(
      z.object({
        /**
         * The airports the page can actually render. Sent by the client
         * because that list lives with the picker; a code outside it fills
         * the form with nothing and reads as a dead button.
         */
        allowed: z.array(iata("Airport")).min(1).max(200),
        query: z.string().min(3).max(500),
      })
    )
    .mutation(async ({ input }) => {
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kuala_Lumpur",
      }).format(new Date());
      const parsed = await parseFareQuery(input.query, today, input.allowed);

      if (parsed === null) {
        return {
          criteria: null,
          error:
            "Couldn't read that as a flight search — try naming the route and date.",
        };
      }
      if ("error" in parsed) {
        return { criteria: null, error: parsed.error };
      }
      return { criteria: parsed, error: null };
    }),

  /**
   * Routes this traveller actually searched, ranked by how often.
   *
   * A route with a real search count says something true and costs no Atlas
   * quota to display.
   */
  popular: protectedProcedure.query(({ ctx }) =>
    db
      .select({
        destination: fareSearch.destination,
        lastSearchedAt: sql<Date>`max(${fareSearch.createdAt})`,
        origin: fareSearch.origin,
        searches: sql<number>`count(*)::int`,
      })
      .from(fareSearch)
      .where(
        and(
          eq(fareSearch.userId, ctx.session.user.id),
          gt(fareSearch.resultCount, 0)
        )
      )
      .groupBy(fareSearch.origin, fareSearch.destination)
      .orderBy(desc(sql`count(*)`))
      .limit(POPULAR_LIMIT)
  ),

  /**
   * The last few distinct searches, newest first.
   *
   * Repeats are collapsed so running the same route twice does not fill the
   * list with one trip.
   */
  recent: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select()
      .from(fareSearch)
      .where(eq(fareSearch.userId, ctx.session.user.id))
      .orderBy(desc(fareSearch.createdAt))
      .limit(RECENT_SCAN_LIMIT);

    const seen = new Set<string>();
    const recent: {
      adults: number;
      cabin: string;
      departureDate: string;
      destination: string;
      id: string;
      origin: string;
      resultCount: number;
      returnDate: string | null;
      source: string;
    }[] = [];

    for (const row of rows) {
      const key = [
        row.origin,
        row.destination,
        row.departureDate,
        row.returnDate ?? "ow",
      ].join("|");

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      recent.push({
        adults: row.adults,
        cabin: row.cabin,
        departureDate: row.departureDate,
        destination: row.destination,
        id: row.id,
        origin: row.origin,
        resultCount: row.resultCount,
        returnDate: row.returnDate,
        source: row.source,
      });

      if (recent.length === RECENT_SHOWN) {
        break;
      }
    }

    return recent;
  }),

  saved: savedFareRouter,

  /**
   * Live Atlas search. Mutation, not query: it writes `fare_search`, takes up
   * to 45s, and must never refetch on focus or we burn daily quota.
   */
  search: protectedProcedure
    .input(searchInputSchema)
    .mutation(({ ctx, input }) => runSearch(ctx.session.user.id, input)),
});
