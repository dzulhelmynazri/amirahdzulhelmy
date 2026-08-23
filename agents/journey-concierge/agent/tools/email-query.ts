import { defineTool } from "eve/tools";
import { z } from "zod";

import { getAtlasClient } from "../lib/atlas";

export default defineTool({
  description:
    "Query booking-related itinerary emails on the Atlas booking API, for example to find a booking from a passenger email address. Read-only.",
  async execute(input) {
    const client = await getAtlasClient();
    return client.utility.emailQuery.query(input);
  },
  inputSchema: z.looseObject({
    email: z
      .string()
      .optional()
      .describe("Passenger email address to look up itinerary emails"),
    orderNo: z.string().optional().describe("Filter by order number"),
    pnr: z.string().optional().describe("Filter by PNR booking reference"),
  }),
});
