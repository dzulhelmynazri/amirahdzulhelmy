import { defineTool } from "eve/tools";
import { z } from "zod";

import { getAtlasClient } from "../lib/atlas";
import { checkRouting } from "../lib/coherence";

export default defineTool({
  description:
    "Verify a selected flight offer on the Atlas booking API before ordering. Re-checks current price and availability, and returns a sessionId that create-order requires. Preserve the returned sessionId and routingIdentifier exactly; if the verified price increased, confirm with the user before creating an order. The result may carry `coherenceFindings` — arithmetic facts about the itinerary (tight or impossible connections, airport changes, long layovers). Relay every one to the traveller before ordering; a disrupted traveller rebooked onto an impossible connection has been disrupted twice.",
  async execute(input) {
    const client = await getAtlasClient();
    const result = await client.flights.verify.verify(input);
    // See booking-agent's copy for why this rides on verify rather than
    // being its own tool: verify is the last read before money moves.
    const coherenceFindings = checkRouting(
      (result as { routing?: unknown }).routing
    );

    return coherenceFindings.length > 0
      ? { ...result, coherenceFindings }
      : result;
  },
  inputSchema: z.object({
    routingIdentifier: z
      .string()
      .describe(
        "Routing identifier of the selected offer, exactly as returned by flight-search"
      ),
  }),
});
