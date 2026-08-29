import { defineTool } from "eve/tools";
import { z } from "zod";

import { getAtlasClient } from "../lib/atlas";

/**
 * Route rows have `fromCity`/`toCity` plus airline and schedule fields; the
 * model needs the city pair, the carriers, and whether it is direct.
 */
interface RouteRow {
  airlines?: unknown;
  fromCity?: unknown;
  isDirect?: unknown;
  toCity?: unknown;
  [key: string]: unknown;
}

const MAX_ROUTES_RETURNED = 50;

const text = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .toUpperCase();

export default defineTool({
  description:
    "Check which routes Atlas can book, filtered by origin and/or destination city. Use to confirm a route is bookable, discover alternate airports, or find connection points before searching fares. At least one of fromCity or toCity is required. Read-only.",
  async execute(input) {
    const from = text(input.fromCity);
    const to = text(input.toCity);

    /**
     * Refused rather than served. Unfiltered, this endpoint returns the whole
     * route table — a measured call came back at 2,058,189 characters, which
     * as a tool result is roughly half a million tokens sitting in context
     * for every step after it. One such call cost more than thirty searches.
     */
    if (!(from || to)) {
      return {
        reason:
          "Pass fromCity and/or toCity (IATA codes). The unfiltered route table is around 2MB, which would swamp this conversation — name the route you are checking instead.",
        routes: [],
      };
    }

    const client = await getAtlasClient();
    const result = await client.utility.routeExport.export(input);
    const rows = (result as { data?: unknown }).data;

    if (!Array.isArray(rows)) {
      return { routes: [], totalFound: 0 };
    }

    const matching = (rows as RouteRow[]).filter(
      (row) =>
        (!from || text(row.fromCity) === from) &&
        (!to || text(row.toCity) === to)
    );

    return {
      returned: Math.min(matching.length, MAX_ROUTES_RETURNED),
      routes: matching.slice(0, MAX_ROUTES_RETURNED).map((row) => ({
        airlines: row.airlines,
        fromCity: row.fromCity,
        isDirect: row.isDirect,
        toCity: row.toCity,
      })),
      totalFound: matching.length,
    };
  },
  inputSchema: z.looseObject({
    fromCity: z.string().optional().describe("Origin city IATA code, e.g. KUL"),
    toCity: z
      .string()
      .optional()
      .describe("Destination city IATA code, e.g. TYO"),
  }),
});
