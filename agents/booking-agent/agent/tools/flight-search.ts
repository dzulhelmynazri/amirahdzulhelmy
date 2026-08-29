import { normalizeRoutings } from "@atlas/atlas-client/fare-compare/normalize";
import { defineTool } from "eve/tools";
import { z } from "zod";

import { getAtlasClient } from "../lib/atlas";
import { persistFareSearch } from "../lib/fare-history";
import { assertFirstSearch, recordSearchResult } from "../lib/one-search";

/**
 * Atlas returns every outbound x inbound combination as its own routing, so an
 * 11-flight day against 10 returns arrives as 100 near-identical entries, each
 * carrying full segment, rule, ancillary and payment payloads. Handed to the
 * model raw that was ~548K input tokens to summarise five flights.
 *
 * Normalising and capping keeps every field the agent actually needs — times,
 * price, baggage and the `routingIdentifier` required to book — while cutting
 * the context by orders of magnitude.
 */
const MAX_FARES_RETURNED = 20;

export default defineTool({
  description:
    "Search flights on the Atlas booking API. Returns available routings with fares for the given route, dates, and passenger counts.",
  async execute(input, context) {
    await assertFirstSearch(context, "flight-search");

    const client = await getAtlasClient();
    const response = await client.flights.search.search(input);

    if (response.status !== 0) {
      return { msg: response.msg, status: response.status };
    }

    // Recorded from the raw response: `routings` is what "found something"
    // means, and the normalised view below is a projection of it.
    await recordSearchResult(context, "flight-search", response);

    const fares = normalizeRoutings(response.routings, {
      airlines: input.airlines ?? [],
      departureDate: input.fromDate,
      destination: input.toCity,
      id: `${input.fromCity}-${input.toCity}`,
      origin: input.fromCity,
      passengers: {
        adults: input.adultNum,
        children: input.childNum,
        infants: input.infantNum,
      },
      ...(input.retDate === undefined ? {} : { returnDate: input.retDate }),
      ...(input.currency ? { currency: input.currency } : {}),
    });

    // `toSorted` is not in this agent's lib target; the copy above keeps the
    // sort non-mutating anyway.
    // oxlint-disable-next-line unicorn/no-array-sort
    const cheapestFirst = [...fares].sort(
      (a, b) => a.adultTotal - b.adultTotal
    );

    // Mirror the search into the /fares history so the page shows what the
    // agent looked up, replayable like any manual search.
    await persistFareSearch(context, input, fares.length);

    return {
      fares: cheapestFirst.slice(0, MAX_FARES_RETURNED).map((fare) => ({
        adultTotal: fare.adultTotal,
        airline: fare.airline,
        baggage: fare.baggage.description,
        cabin: fare.cabin,
        currency: fare.currency,
        // Opaque token the downstream verify/order tools require.
        outbound: fare.outbound,
        routingIdentifier: fare.routingIdentifier,
        sellable: fare.sellable,
        ...(fare.inbound === undefined ? {} : { inbound: fare.inbound }),
      })),
      returned: Math.min(cheapestFirst.length, MAX_FARES_RETURNED),
      totalFound: fares.length,
    };
  },
  inputSchema: z.object({
    adultNum: z
      .number()
      .int()
      .min(1)
      .default(1)
      .describe("Number of adult passengers"),
    airlines: z
      .array(z.string())
      .optional()
      .describe('Filter by airline IATA codes, e.g. ["MH", "SQ"]'),
    childNum: z
      .number()
      .int()
      .min(0)
      .default(0)
      .describe("Number of child passengers"),
    currency: z.string().nullish().describe("Preferred pricing currency code"),
    displayCurrency: z
      .string()
      .optional()
      .describe("Currency to display prices in"),
    fromAirport: z
      .string()
      .optional()
      .describe("Origin airport IATA code to narrow within the city"),
    fromCity: z.string().min(3).describe("Origin city IATA code, e.g. KUL"),
    fromDate: z.string().describe("Departure date in YYYY-MM-DD format"),
    infantNum: z
      .number()
      .int()
      .min(0)
      .default(0)
      .describe("Number of infant passengers"),
    retDate: z
      .string()
      .optional()
      .describe("Return date in YYYY-MM-DD format, required for round-trips"),
    toAirport: z
      .string()
      .optional()
      .describe("Destination airport IATA code to narrow within the city"),
    toCity: z.string().min(3).describe("Destination city IATA code, e.g. SIN"),
    tripType: z
      .enum(["OW", "RT"])
      .default("OW")
      .describe("Trip type: OW for one-way, RT for round-trip"),
  }),
});
