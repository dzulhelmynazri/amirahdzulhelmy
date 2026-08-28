import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";

import { getAtlasClient } from "../lib/atlas";
import { persistBooking } from "../lib/bookings";

export default defineTool({
  approval: always(),
  description:
    "Halt ticket issuance on an Atlas order that has been paid but not yet ticketed. The narrow window where a mistake is still cheap to undo: once tickets issue, the remedy is a void or a refund, with the fees those carry. Use when the traveller says stop and the order has not issued. Never retry automatically — issuance may already have begun.",
  async execute(input, context) {
    const client = await getAtlasClient();
    const result = await client.postBooking.stopTicketIssuance.stop(input);
    await persistBooking(context, "issuance_stopped", result, input.orderNo);
    return result;
  },
  inputSchema: z.looseObject({
    orderNo: z.string().describe("Order number to halt issuance on"),
  }),
});
