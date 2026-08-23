import { defineTool } from "eve/tools";
import { z } from "zod";

import { getAtlasClient } from "../lib/atlas";

export default defineTool({
  description:
    "Query the current status of a flight order on the Atlas booking API, including payment and ticketing progress. Use this for all follow-up checks after an order or payment; do not describe pending ticketing as failure. Read-only.",
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
