import type { ToolContext } from "eve/tools";
import { Resend } from "resend";

/**
 * The booking confirmation the traveller actually receives.
 *
 * Atlas does not send one, and nothing else here did either — the agent used
 * to say "confirmation emails will go to …" and two inboxes stayed empty. The
 * address never comes back from Atlas (`contactEmail` is returned blank), so
 * `create-order` stores what it was given and this reads it at payment time.
 *
 * Best effort throughout: a booking that is paid and ticketed must never fail
 * because an email did not go out.
 */

let client: Resend | null = null;

const resend = (): Resend | null => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  client ??= new Resend(apiKey);
  return client;
};

const orderNoOf = (result: unknown): string | undefined => {
  if (typeof result !== "object" || result === null) {
    return;
  }
  const { orderNo } = result as { orderNo?: unknown };
  return typeof orderNo === "string" && orderNo !== "" ? orderNo : undefined;
};

/** Where `create-order` parks the addresses for `payment-and-ticketing`. */
export const CONTACTS_KEY = "atlasConfirmationContacts";

const uniqueEmails = (values: readonly (string | undefined)[]): string[] => [
  ...new Set(
    values
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.includes("@"))
  ),
];

/** Pulls every address worth writing to out of a create-order input. */
export const contactsFromOrderInput = (input: unknown): string[] => {
  if (typeof input !== "object" || input === null) {
    return [];
  }

  const { contact, passengers } = input as {
    contact?: { email?: string };
    passengers?: readonly { email?: string }[];
  };

  return uniqueEmails([
    contact?.email,
    ...(passengers ?? []).map((passenger) => passenger.email),
  ]);
};

const lines = (input: {
  orderNo: string;
  pnr?: string;
  summary?: string;
}): string => {
  const parts = [
    "Your booking is confirmed.",
    "",
    `Order number: ${input.orderNo}`,
    ...(input.pnr ? [`Booking reference (PNR): ${input.pnr}`] : []),
    ...(input.summary ? ["", input.summary] : []),
    "",
    "Keep the order number — it is what any airline or agent will ask for.",
    "Ticketing can take a few minutes to finish after payment; the reference above is valid either way.",
  ];

  return parts.join("\n");
};

export const sendBookingConfirmation = async (
  context: ToolContext,
  input: {
    orderNo: string;
    pnr?: string;
    recipients: readonly string[];
    summary?: string;
  }
): Promise<void> => {
  try {
    const to = uniqueEmails(input.recipients);
    const fromAddress = process.env.RESEND_FROM_ADDRESS;
    const mailer = resend();

    if (to.length === 0 || !fromAddress || !mailer) {
      return;
    }

    await mailer.emails.send(
      {
        from: fromAddress,
        subject: `Booking confirmed — ${input.orderNo}`,
        text: lines(input),
        to: [...to],
      },
      // Paying twice must not mean two confirmations; the order number is the
      // natural key for exactly one email.
      { idempotencyKey: `booking-confirmation/${input.orderNo}` }
    );
  } catch {
    // A booking that is paid and ticketed must never fail because an email
    // did not go out. The order number is already on screen and in the panel.
  }
};

/** Stores the addresses on the booking row so payment can read them back. */
export const rememberConfirmationContacts = async (
  context: ToolContext,
  result: unknown,
  recipients: readonly string[]
): Promise<void> => {
  try {
    if (recipients.length === 0) {
      return;
    }

    const orderNo = orderNoOf(result);
    if (!orderNo) {
      return;
    }

    const { db } = await import("@atlas/db");
    const { booking } = await import("@atlas/db/schema/booking");
    const { eq, sql } = await import("drizzle-orm");

    await db
      .update(booking)
      .set({
        payload: sql`jsonb_set(coalesce(${booking.payload}, '{}'::jsonb), ${`{${CONTACTS_KEY}}`}, ${JSON.stringify(recipients)}::jsonb, true)`,
      })
      .where(eq(booking.orderNo, orderNo));
  } catch {
    // Losing the addresses costs an email, never the booking.
  }
};

/** Reads them back at payment time. */
export const recallConfirmationContacts = async (
  orderNo: string
): Promise<string[]> => {
  try {
    const { db } = await import("@atlas/db");
    const { booking } = await import("@atlas/db/schema/booking");
    const { eq } = await import("drizzle-orm");

    const [row] = await db
      .select({ payload: booking.payload })
      .from(booking)
      .where(eq(booking.orderNo, orderNo));

    const payload = row?.payload as Record<string, unknown> | null | undefined;
    const stored = payload?.[CONTACTS_KEY];

    return Array.isArray(stored) ? uniqueEmails(stored.map(String)) : [];
  } catch {
    return [];
  }
};
