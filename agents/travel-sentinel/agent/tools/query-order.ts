import { defineTool } from "eve/tools";
import { z } from "zod";

import { getAtlasClient } from "../lib/atlas";

export default defineTool({
  description:
    "Query the current status of a flight order on the Atlas booking API, including payment and ticketing progress. Use to confirm destination, itinerary, and flight details before searching for travel intelligence. Read-only.",
  async execute(input) {
    const client = await getAtlasClient();
    return client.flights.queryOrder.query(input);
  },
  inputSchema: z.object({
    orderNo: z
      .string()
      .describe("Order number, exactly as returned by create-order"),
  }),
});
