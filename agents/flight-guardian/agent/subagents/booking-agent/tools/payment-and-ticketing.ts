import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";

import { getAtlasClient } from "../lib/atlas";
import { persistBooking } from "../lib/bookings";
import {
  recallConfirmationContacts,
  sendBookingConfirmation,
} from "../lib/confirmation-email";

const pnrOf = (result: unknown): string | undefined => {
  if (typeof result !== "object" || result === null) {
    return;
  }
  const { pnrCode } = result as { pnrCode?: unknown };
  return typeof pnrCode === "string" && pnrCode !== "" ? pnrCode : undefined;
};

export default defineTool({
  approval: always(),
  description:
    "Pay for a flight order and issue tickets on the Atlas booking API. Only call after the user explicitly confirms the current payment total; pay at most once per order, never reuse a confirmation ID, and never retry after an unclear result. If the result is unclear, use query-order instead of paying again.",
  async execute(input, context) {
    const client = await getAtlasClient();
    // paymentMethod 1 = Atlas deposit balance; /pay.do rejects requests without it.
    const result = await client.flights.paymentAndTicketing.pay({
      paymentMethod: 1,
      ...input,
    });
    await persistBooking(context, "issued", result, input.orderNo);
    // The confirmation the traveller was always promised and never got.
    // Addresses were stored by create-order; Atlas returns them blank.
    await sendBookingConfirmation(context, {
      orderNo: input.orderNo,
      pnr: pnrOf(result),
      recipients: await recallConfirmationContacts(input.orderNo),
    });
    return result;
  },
  inputSchema: z.object({
    orderNo: z
      .string()
      .describe("Order number, exactly as returned by create-order"),
  }),
});
