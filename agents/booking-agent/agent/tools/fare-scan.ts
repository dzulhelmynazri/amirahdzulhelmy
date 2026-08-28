import { runFareCompare } from "@atlas/atlas-client/fare-compare/run";
import { defineTool } from "eve/tools";
import { z } from "zod";

/**
 * "Cheapest day in the window", answered in one tool call.
 *
 * Atlas has no multi-date search — every endpoint takes exactly one departure
 * date — so "cheapest in September" used to mean the model probing dates one
 * search at a time: a measured run spent 13 steps and 36 search calls on it,
 * paying the whole conversation again on every step. The fan-out belongs in
 * code, where dates run concurrently under rate control and the model reads
 * one summary instead of thirteen fare tables.
 *
 * The batch runner already existed for the pre-sales CLI; this is the same
 * instrument pointed at a traveller's question.
 *
 * Deliberately outside the one-search guard. A scan is the prelude to a
 * booking, not a competitor to it: claiming the turn's search slot here would
 * refuse the exact-date flight-search the traveller's choice requires next.
 * Its own costs are bounded in code instead — 14 dates per call, the batch
 * runner's QPS pacing, and a one-line-per-day result.
 */

const MAX_DATES = 14;
const DAY_MS = 86_400_000;

const DATE_SHAPE = /^\d{4}-\d{2}-\d{2}$/u;

const expandDates = (startDate: string, endDate: string): string[] | null => {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);

  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return null;
  }

  const dates: string[] = [];

  for (let at = start; at <= end && dates.length <= MAX_DATES; at += DAY_MS) {
    dates.push(new Date(at).toISOString().slice(0, 10));
  }

  return dates;
};

const credentials = () => {
  const apiUrl = process.env.ATLAS_API_URL;
  const clientId = process.env.ATLAS_CLIENT_ID;
  const clientSecret = process.env.ATLAS_CLIENT_SECRET;

  if (!(apiUrl && clientId && clientSecret)) {
    return null;
  }

  return { apiUrl, clientId, clientSecret };
};

export default defineTool({
  description:
    "Scan a date window for the cheapest fares on one route, in a single call. Use for 'cheapest day in <month>', '+/- a few days', or any question that spans dates — never probe dates one search at a time. Covers up to 14 days per call; for a whole month, scan the two or three most plausible weeks. Comparison-level prices: when the traveller picks a date, run flight-search on that exact date and book from its result.",
  async execute(input) {
    const dates = expandDates(input.startDate, input.endDate);

    if (!dates) {
      return {
        reason: `The window ${input.startDate} to ${input.endDate} is not a valid range. Dates are YYYY-MM-DD and the end cannot be before the start.`,
        scanned: [],
      };
    }

    if (dates.length > MAX_DATES) {
      return {
        reason: `That window is ${dates.length} days; the scan covers at most ${MAX_DATES} per call. Narrow the window or scan it in parts.`,
        scanned: [],
      };
    }

    const creds = credentials();

    if (!creds) {
      return {
        reason: "Atlas credentials are not configured on this deployment.",
        scanned: [],
      };
    }

    const { result } = await runFareCompare(
      creds,
      {
        departureDates: dates,
        destinations: [input.toCity.toUpperCase()],
        origins: [input.fromCity.toUpperCase()],
        passengers: [
          {
            adults: input.adultNum ?? 1,
            children: input.childNum ?? 0,
            infants: input.infantNum ?? 0,
          },
        ],
        ...(input.currency ? { currencies: [input.currency] } : {}),
      },
      // The runner's own concurrency and QPS pacing apply; the cap here stops
      // a wide window from spending the daily quota in one question.
      { maxRequests: MAX_DATES }
    );

    // Cheapest per date — the shape of the question being asked. One line per
    // day beats thirteen fare tables, and the identifiers are deliberately
    // absent: these are comparison prices, and booking starts from a fresh
    // flight-search on the chosen date.
    const byDate = new Map<
      string,
      { adultTotal: number; airline: string; currency: string; stops: number }
    >();

    for (const fare of result.fares) {
      // The leg's own date: NormalizedFare carries no query object.
      const { date } = fare.outbound;
      const seen = byDate.get(date);

      if (!seen || fare.adultTotal < seen.adultTotal) {
        byDate.set(date, {
          adultTotal: fare.adultTotal,
          airline: fare.airline,
          currency: fare.currency,
          stops: fare.outbound.stops,
        });
      }
    }

    const scanned = [...byDate.entries()]
      .map(([date, cheapest]) => ({ date, ...cheapest }))
      .toSorted((a, b) => a.date.localeCompare(b.date));

    return {
      cheapestOverall: scanned.toSorted(
        (a, b) => a.adultTotal - b.adultTotal
      )[0],
      datesWithNoFares: dates.filter((date) => !byDate.has(date)),
      scanned,
    };
  },
  inputSchema: z.object({
    adultNum: z.number().int().min(1).optional().describe("Number of adults"),
    childNum: z.number().int().min(0).optional().describe("Number of children"),
    currency: z.string().optional().describe("Settlement currency, ISO 4217"),
    endDate: z
      .string()
      .regex(DATE_SHAPE)
      .describe("Last date to scan, YYYY-MM-DD"),
    fromCity: z.string().describe("Origin city IATA code, e.g. KUL"),
    infantNum: z.number().int().min(0).optional().describe("Number of infants"),
    startDate: z
      .string()
      .regex(DATE_SHAPE)
      .describe("First date to scan, YYYY-MM-DD"),
    toCity: z.string().describe("Destination city IATA code, e.g. TYO"),
  }),
});
