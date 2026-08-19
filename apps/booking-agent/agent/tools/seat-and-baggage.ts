import { defineTool } from "eve/tools";
import { z } from "zod";

import { getAtlasClient } from "../lib/atlas";

export default defineTool({
  description:
    "Fetch available seats and baggage options for a verified flight offer on the Atlas booking API. Call after flight-verify and before create-order. When a seat is chosen, ask the user whether to continue without the seat, cancel the order, or accept a similar seat if the exact seat is unavailable. Read-only.",
  async execute(input) {
    const client = await getAtlasClient();
    return client.flights.seatAndBaggage.get(input);
  },
  inputSchema: z.object({
    routingIdentifier: z
      .string()
      .describe("Routing identifier of the verified offer"),
    sessionId: z.string().describe("Session ID returned by flight-verify"),
  }),
});
