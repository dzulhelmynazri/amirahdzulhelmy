import { defineTool } from "eve/tools";
import { z } from "zod";

import { getAtlasClient } from "../lib/atlas";

export default defineTool({
  description:
    "Read the current price of a known offer on the Atlas booking API. Read-only, and not a substitute for flight-verify: verifying is what produces the sessionId an order needs. Use this to check whether a quoted price still holds before asking the traveller to commit to it.",
  async execute(input) {
    const client = await getAtlasClient();
    return client.flights.getOfferPrice.get(input);
  },
  inputSchema: z.looseObject({
    offerId: z
      .string()
      .optional()
      .describe("Offer identifier, exactly as Atlas returned it"),
    routingIdentifier: z
      .string()
      .optional()
      .describe("Routing identifier from a search result"),
  }),
});
