import { defineDynamic, defineTool } from "eve/tools";
import { z } from "zod";

import { getAtlasClient } from "../lib/atlas";
import { shouldOmitExtraSearchTools } from "../lib/first-hop-tools";

export default defineDynamic({
  events: {
    "turn.started": (_event, ctx) => {
      if (shouldOmitExtraSearchTools(ctx)) {
        return null;
      }

      return defineTool({
        description:
          "Smart flight search on the Atlas booking API with flexible date handling. Accepts flight-search style inputs (origin, destination, dates, passenger counts); returns routings with fares. Read-only.",
        async execute(input) {
          const client = await getAtlasClient();
          return client.flights.smartSearch.search(input);
        },
        inputSchema: z.looseObject({
          adultNum: z
            .number()
            .int()
            .min(1)
            .optional()
            .describe("Number of adults"),
          childNum: z
            .number()
            .int()
            .min(0)
            .optional()
            .describe("Number of children"),
          fromCity: z
            .string()
            .optional()
            .describe("Origin city IATA code, e.g. KUL"),
          fromDate: z
            .string()
            .optional()
            .describe("Departure date, YYYY-MM-DD"),
          infantNum: z
            .number()
            .int()
            .min(0)
            .optional()
            .describe("Number of infants"),
          retDate: z.string().optional().describe("Return date, YYYY-MM-DD"),
          toCity: z
            .string()
            .optional()
            .describe("Destination city IATA code, e.g. SIN"),
          tripType: z
            .enum(["OW", "RT"])
            .optional()
            .describe("Trip type: OW for one-way, RT for round-trip"),
        }),
      });
    },
  },
});
