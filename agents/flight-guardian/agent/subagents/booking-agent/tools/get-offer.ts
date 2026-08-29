import { defineTool } from "eve/tools";
import { z } from "zod";

import { getAtlasClient } from "../lib/atlas";

export default defineTool({
  description:
    "Fetch a single offer from the Atlas booking API by its identifier. Read-only. Use to re-read an offer the traveller was already shown — after a search, or when returning to a conversation — rather than searching again and getting a different set of results.",
  async execute(input) {
    const client = await getAtlasClient();
    return client.flights.getOffer.get(input);
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
