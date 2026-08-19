import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";

import { getAtlasClient } from "../lib/atlas";
import { persistBooking } from "../lib/bookings";

export default defineTool({
  approval: always(),
  description:
    "Void a flight order on the Atlas booking API. Voiding is irreversible and only valid before ticketing; confirm the order number with the user first.",
  async execute(input, context) {
    const client = await getAtlasClient();
    const result = await client.postBooking.void.create(input);
    await persistBooking(context, "voided", result, input.orderNo);
    return result;
  },
  inputSchema: z.looseObject({
    orderNo: z.string().describe("Order number to void"),
    subOrderNo: z
      .string()
      .optional()
      .describe("Sub-order number for a partial void"),
  }),
});
