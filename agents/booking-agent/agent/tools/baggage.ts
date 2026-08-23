import { defineTool } from "eve/tools";
import { z } from "zod";

import { getAtlasClient } from "../lib/atlas";

export default defineTool({
  description:
    "Fetch baggage options for a verified flight offer on the Atlas booking API. Call after flight-verify and before create-order. Read-only.",
  async execute(input) {
    const client = await getAtlasClient();
    return client.flights.baggage.get(input);
  },
  inputSchema: z.object({
    routingIdentifier: z
      .string()
      .describe("Routing identifier of the verified offer"),
    sessionId: z.string().describe("Session ID returned by flight-verify"),
  }),
});
