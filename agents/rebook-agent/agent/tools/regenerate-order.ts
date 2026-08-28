import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";

import { getAtlasClient } from "../lib/atlas";
import { persistBooking } from "../lib/bookings";

export default defineTool({
  approval: always(),
  description:
    "Rebuild an Atlas order that failed part-way through creation, keeping the same passengers and itinerary. Use when create-order returned an error or an order is stuck in a state it cannot leave — not as a retry of a call that may have succeeded. Query the order first: an order that exists must never be regenerated, or the traveller ends up holding two.",
  async execute(input, context) {
    const client = await getAtlasClient();
    const result = await client.postBooking.regenerateOrder.regenerate(input);
    await persistBooking(context, "order_regenerated", result, input.orderNo);
    return result;
  },
  inputSchema: z.looseObject({
    orderNo: z.string().describe("Order number to regenerate"),
  }),
});
