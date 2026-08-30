import { defineTool } from "eve/tools";
import { once } from "eve/tools/approval";
import { z } from "zod";

import { getAtlasClient } from "../lib/atlas";
import { persistBooking } from "../lib/bookings";

export default defineTool({
  approval: once(),
  description:
    "Confirm a created flight order on the Atlas booking API and get its confirmation or payment URL. Confirm the order number and total with the user first; only call once per order.",
  async execute(input, context) {
    const client = await getAtlasClient();
    const result = await client.flights.confirmOrder.confirm(input);
    await persistBooking(context, "confirmed", result, input.orderNo);
    return result;
  },
  inputSchema: z.looseObject({
    iframe: z
      .boolean()
      .optional()
      .describe("Whether the confirmation page is embedded in an iframe"),
    orderNo: z
      .string()
      .describe("Order number, exactly as returned by create-order"),
    redirectUri: z
      .string()
      .optional()
      .describe("URI to redirect to after confirmation"),
    timeout: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("Confirmation timeout in seconds"),
  }),
});
