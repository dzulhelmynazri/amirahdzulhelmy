import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";

import { getAtlasClient } from "../lib/atlas";
import { persistBooking } from "../lib/bookings";

export default defineTool({
  approval: always(),
  description:
    "Create a refund request for a flight order on the Atlas booking API. Confirm the order and refund scope with the user before requesting; never retry automatically.",
  async execute(input, context) {
    const client = await getAtlasClient();
    const result = await client.postBooking.refunds.create(input);
    await persistBooking(context, "refund_requested", result, input.orderNo);
    return result;
  },
  inputSchema: z.looseObject({
    orderNo: z.string().describe("Order number to refund"),
    subOrderNo: z
      .string()
      .optional()
      .describe("Sub-order number for a partial refund"),
  }),
});
