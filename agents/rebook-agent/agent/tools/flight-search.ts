import { defineTool } from "eve/tools";
import { z } from "zod";

import { getAtlasClient } from "../lib/atlas";
import { assertFirstSearch, recordSearchResult } from "../lib/one-search";

export default defineTool({
  description:
    "Search flights on the Atlas booking API. Returns available routings with fares for the given route, dates, and passenger counts.",
  async execute(input, context) {
    assertFirstSearch(context, "flight-search");

    const client = await getAtlasClient();
    const result = await client.flights.search.search(input);

    recordSearchResult(context, "flight-search", result);

    return result;
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
