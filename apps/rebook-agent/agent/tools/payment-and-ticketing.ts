import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";

import { getAtlasClient } from "../lib/atlas";
import { persistBooking } from "../lib/bookings";

export default defineTool({
  approval: always(),
  description:
    "Pay for a flight order and issue tickets on the Atlas booking API. Only call after the user explicitly confirms the current payment total; pay at most once per order, never reuse a confirmation ID, and never retry after an unclear result. If the result is unclear, use query-order instead of paying again.",
  async execute(input, context) {
    const client = await getAtlasClient();
    const result = await client.flights.paymentAndTicketing.pay(input);
    await persistBooking(context, "issued", result, input.orderNo);
    return result;
  },
  inputSchema: z.object({
    orderNo: z
      .string()
      .describe("Order number, exactly as returned by create-order"),
  }),
});
