import { defineTool } from "eve/tools";
import { z } from "zod";

import { getAtlasClient } from "../lib/atlas";

export default defineTool({
  description:
    "Verify a selected flight offer on the Atlas booking API before ordering. Re-checks current price and availability, and returns a sessionId that create-order requires. Preserve the returned sessionId and routingIdentifier exactly; if the verified price increased, confirm with the user before creating an order.",
  async execute(input) {
    const client = await getAtlasClient();
    return client.flights.verify.verify(input);
  },
  inputSchema: z.object({
    routingIdentifier: z
      .string()
      .describe(
        "Routing identifier of the selected offer, exactly as returned by flight-search"
      ),
  }),
});
