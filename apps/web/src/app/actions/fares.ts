"use server";

import { createAtlasClient } from "@atlas/atlas-client";
import { normalizeRoutings } from "@atlas/atlas-client/fare-compare/normalize";
import type { NormalizedFare } from "@atlas/atlas-client/fare-compare/types";
import { auth } from "@atlas/auth";
import { db } from "@atlas/db";
import { fareSearch } from "@atlas/db/schema/fares";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { headers } from "next/headers";

/**
 * Runs a live Atlas flight search for the fares page.
 *
 * Server-only: the Atlas client secret is read here and never crosses to the
 * browser. Uses `/search.do` — the normal booking-flow search — rather than
 * `/priceCompareSearch.do`, which the API reference reserves for pre-sales
 * benchmarking and explicitly tells you not to price a booking flow from.
 */

export interface FareSearchInput {
  adults: number;
  cabin: string;
  children: number;
  currency: string;
  departureDate: string;
  destination: string;
  infants: number;
  origin: string;
  returnDate?: string;
}

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

/**
 * Atlas status codes rewritten for travellers. The raw strings are written for
 * integrators ("Currency not supported for settlement") and must not reach the
 * page. Anything unmapped falls back to a generic line — never the raw message.
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

const ISO_FROM_COMPACT = (value: string) =>
  value.length === 8
    ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
    : value;

const SEARCH_TIMEOUT_MS = 45_000;
const MAX_ADULTS = 9;
const MAX_CHILDREN = 8;
const IATA_PATTERN = /^[A-Z]{3}$/u;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const DATE_SEPARATOR = /-/gu;

const toCompactDate = (value: string) => value.replace(DATE_SEPARATOR, "");

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

/** Rejects a bad request locally instead of spending an Atlas search on it. */
const validate = (input: FareSearchInput): string | undefined => {
  if (!IATA_PATTERN.test(input.origin)) {
    return "Origin must be a 3-letter airport code.";
  }
  if (!IATA_PATTERN.test(input.destination)) {
    return "Destination must be a 3-letter airport code.";
  }
  if (input.origin === input.destination) {
    return "Origin and destination must be different.";
  }
  if (!ISO_DATE_PATTERN.test(input.departureDate)) {
    return "Departure date is invalid.";
  }
  if (
    input.returnDate !== undefined &&
    !ISO_DATE_PATTERN.test(input.returnDate)
  ) {
    return "Return date is invalid.";
  }
  if (input.adults < 1 || input.adults > MAX_ADULTS) {
    return `Adults must be between 1 and ${MAX_ADULTS}.`;
  }
  if (input.children < 0 || input.children > MAX_CHILDREN) {
    return `Children must be between 0 and ${MAX_CHILDREN}.`;
  }
  if (input.infants < 0 || input.infants > input.adults) {
    return "Infants cannot outnumber adults.";
  }
};

/**
 * Logs the search criteria and result count. Best-effort: a logging failure
 * must never cost the traveller their results, so it is swallowed.
 */
const recordSearch = async (
  userId: string,
  input: FareSearchInput,
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
        .map(ISO_FROM_COMPACT)
    : [];

  return {
    fares: [],
    noResultMessage:
      (code === undefined ? undefined : NO_RESULT_MESSAGES[code]) ??
      "No flights found for these dates.",
    ...(nearbyDates.length === 0 ? {} : { nearbyDates }),
  };
};

export const searchFares = async (
  input: FareSearchInput
): Promise<FareSearchOutcome> => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return { error: "You need to be signed in to search fares.", fares: [] };
  }

  const invalid = validate(input);

  if (invalid) {
    return { error: invalid, fares: [] };
  }

  const atlas = createAtlasClient();
  const departureDate = toCompactDate(input.departureDate);
  const returnDate =
    input.returnDate === undefined
      ? undefined
      : toCompactDate(input.returnDate);

  let response: Record<string, unknown> | undefined;

  try {
    response = asRecord(
      await atlas.client.post<unknown>(
        "/search.do",
        {
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
        },
        { timeoutMs: SEARCH_TIMEOUT_MS }
      )
    );
  } catch {
    return { error: GENERIC_ERROR, fares: [] };
  }

  if (!response || typeof response.status !== "number") {
    return { error: GENERIC_ERROR, fares: [] };
  }

  const requestId =
    typeof response.requestId === "string" ? response.requestId : undefined;

  // Atlas signals business errors with a non-zero status inside an HTTP 200.
  // The raw `msg` is integrator-facing, so it is logged, never surfaced.
  if (response.status !== 0) {
    return {
      error: USER_FACING_ERRORS[response.status] ?? GENERIC_ERROR,
      fares: [],
      ...(requestId === undefined ? {} : { requestId }),
    };
  }

  const fares = normalizeRoutings(response.routings, {
    airlines: [],
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
    currency: input.currency,
  });

  const searchId = await recordSearch(
    session.user.id,
    input,
    fares.length,
    requestId
  );

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

export interface RecentSearch {
  adults: number;
  cabin: string;
  departureDate: string;
  destination: string;
  id: string;
  origin: string;
  resultCount: number;
  returnDate: string | null;
}

const RECENT_SCAN_LIMIT = 30;
const RECENT_SHOWN = 4;

/**
 * The last few distinct searches, newest first.
 *
 * The page had no memory: every visit started from an empty form even though
 * every search was already being written to `fare_search`. Repeats are collapsed
 * so running the same route twice does not fill the list with one trip.
 */
export const listRecentSearches = async (): Promise<RecentSearch[]> => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return [];
  }

  try {
    const rows = await db
      .select()
      .from(fareSearch)
      .where(eq(fareSearch.userId, session.user.id))
      .orderBy(desc(fareSearch.createdAt))
      .limit(RECENT_SCAN_LIMIT);

    const seen = new Set<string>();
    const recent: RecentSearch[] = [];

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
      });

      if (recent.length === RECENT_SHOWN) {
        break;
      }
    }

    return recent;
  } catch {
    return [];
  }
};

export interface PopularRoute {
  destination: string;
  lastSearchedAt: Date;
  origin: string;
  searches: number;
}

const POPULAR_LIMIT = 6;

/**
 * Routes people actually searched, ranked by how often.
 *
 * Replaces a hand-written list of invented deals. Showing fabricated prices
 * beside live ones taught travellers not to trust either; a route with a real
 * search count says something true and costs no Atlas quota to display.
 */
export const listPopularRoutes = async (): Promise<PopularRoute[]> => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return [];
  }

  try {
    return await db
      .select({
        destination: fareSearch.destination,
        lastSearchedAt: sql<Date>`max(${fareSearch.createdAt})`,
        origin: fareSearch.origin,
        searches: sql<number>`count(*)::int`,
      })
      .from(fareSearch)
      .where(
        and(
          eq(fareSearch.userId, session.user.id),
          gt(fareSearch.resultCount, 0)
        )
      )
      .groupBy(fareSearch.origin, fareSearch.destination)
      .orderBy(desc(sql`count(*)`))
      .limit(POPULAR_LIMIT);
  } catch {
    return [];
  }
};
