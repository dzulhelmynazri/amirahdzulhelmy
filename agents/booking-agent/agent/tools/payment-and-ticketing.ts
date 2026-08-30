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
    // Read the addresses before persisting: the persist rewrites the payload
    // they live in, and reading afterwards is how every email silently sent
    // to nobody.
    const recipients = await recallConfirmationContacts(input.orderNo);
    await persistBooking(context, "issued", result, input.orderNo);
    // The pay response is thin; the full order (passengers, flight times) is
    // what makes the confirmation email worth opening. Best-effort — a failed
    // read sends the short email rather than none.
    const order = await client.flights.queryOrder
      .query({ orderNo: input.orderNo })
      .catch(() => null);
    const confirmationEmail = await sendBookingConfirmation(context, {
      order,
      orderNo: input.orderNo,
      pnr: pnrOf(result) ?? pnrOf(order),
      recipients,
    });
    // Surfaced so the recap can say what actually happened to the email —
    // "sent to x@y" or the reason it was not — instead of guessing.
    return { ...(result as object), confirmationEmail };
  },
  inputSchema: z.object({
    orderNo: z
      .string()
      .describe("Order number, exactly as returned by create-order"),
  }),
});
