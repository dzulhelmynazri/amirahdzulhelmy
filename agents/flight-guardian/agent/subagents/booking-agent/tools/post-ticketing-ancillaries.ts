import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";

import { getAtlasClient } from "../lib/atlas";
import { persistBooking } from "../lib/bookings";

export default defineTool({
  approval: always(),
  description:
    "Buy baggage or seats on the Atlas booking API for an order that is already ticketed. This is the one that costs money after the fact: `seat-and-baggage` and `baggage` belong between verify and order creation, and stop working once tickets are issued. Confirm the item and the total with the traveller first, and never retry automatically — a rejected call can still have gone through.",
  async execute(input, context) {
    const client = await getAtlasClient();
    const result = await client.postBooking.postTicketingAncillaries.get(input);
    await persistBooking(context, "ancillary_purchased", result, input.orderNo);
    return result;
  },
  inputSchema: z.looseObject({
    orderNo: z.string().describe("Order number the ancillary is added to"),
    passengerIndex: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("Which passenger on the order, when the item is per-person"),
    segmentIndex: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("Which flight segment, when the item is per-leg"),
  }),
});
