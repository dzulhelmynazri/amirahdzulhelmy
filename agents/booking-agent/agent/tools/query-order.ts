import { defineTool } from "eve/tools";
import { z } from "zod";

import { getAtlasClient } from "../lib/atlas";
import { persistBooking } from "../lib/bookings";

export default defineTool({
  description:
    "Query the current status of a flight order on the Atlas booking API, including payment and ticketing progress. Use this for all follow-up checks after an order or payment; do not describe pending ticketing as failure. Read-only.",
  async execute(input, context) {
    const client = await getAtlasClient();
    const result = await client.flights.queryOrder.query(input);

    // This is the only call that returns the full order — passengers, routing,
    // airline PNRs, refund rules. Every other tool writes a thinner snapshot,
    // so without persisting here the stored booking never gains its details.
    // Status is left alone: this is a read, not a state change. And it
    // only enriches a booking this caller already owns — a lookup accepts
    // any order number, so creating from one would let a traveller claim
    // somebody else's booking by naming it.
    await persistBooking(context, null, result, input.orderNo, {
      enrichOnly: true,
    });

    return result;
  },
  inputSchema: z.object({
    orderNo: z
      .string()
      .describe("Order number, exactly as returned by create-order"),
  }),
});
