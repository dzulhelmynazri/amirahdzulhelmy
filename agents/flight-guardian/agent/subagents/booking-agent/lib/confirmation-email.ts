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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asString = (value: unknown): string =>
  typeof value === "string" ? value : "";

/** IATA code whichever shape Atlas used: bare string or {code, city}. */
const airportOf = (value: unknown): string =>
  typeof value === "string" ? value : asString(isRecord(value) && value.code);

/** Atlas times are `YYYYMMDDHHMM`; render "11 Sep 2026, 07:10". */
const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
const timeOf = (value: unknown): string => {
  const raw = asString(value);
  if (raw.length < 12) {
    return raw;
  }
  const month = MONTHS[Number(raw.slice(4, 6)) - 1] ?? raw.slice(4, 6);
  return `${Number(raw.slice(6, 8))} ${month} ${raw.slice(0, 4)}, ${raw.slice(8, 10)}:${raw.slice(10, 12)}`;
};

interface EmailSegment {
  arr: string;
  arrTime: string;
  dep: string;
  depTime: string;
  flight: string;
}

/** Flight rows and passenger names from a query-order response, best-effort. */
const describeOrder = (
  order: unknown
): { passengers: string[]; segments: EmailSegment[] } => {
  const passengers: string[] = [];
  const segments: EmailSegment[] = [];
  if (!isRecord(order)) {
    return { passengers, segments };
  }

  if (Array.isArray(order.passengers)) {
    for (const entry of order.passengers) {
      const name = asString(isRecord(entry) && entry.name);
      if (name) {
        passengers.push(name);
      }
    }
  }

  const routing = isRecord(order.routing) ? order.routing : {};
  for (const key of ["fromSegments", "retSegments"]) {
    const list = routing[key];
    if (!Array.isArray(list)) {
      continue;
    }
    for (const entry of list) {
      if (!isRecord(entry)) {
        continue;
      }
      const carrier = asString(entry.carrier);
      const number = asString(entry.flightNumber);
      segments.push({
        arr: airportOf(entry.arrAirport),
        arrTime: timeOf(entry.arrTime),
        dep: airportOf(entry.depAirport),
        depTime: timeOf(entry.depTime),
        flight: number.startsWith(carrier) ? number : `${carrier}${number}`,
      });
    }
  }
  return { passengers, segments };
};

const lines = (input: {
  order?: unknown;
  orderNo: string;
  pnr?: string;
  summary?: string;
}): string => {
  const { passengers, segments } = describeOrder(input.order);
  const parts = [
    "Your booking is confirmed. ✈",
    "",
    ...(input.pnr ? [`Booking reference (PNR): ${input.pnr}`] : []),
    `Order number: ${input.orderNo}`,
    ...(passengers.length > 0
      ? [
          `Passenger${passengers.length > 1 ? "s" : ""}: ${passengers.join(", ")}`,
        ]
      : []),
    ...(segments.length > 0
      ? [
          "",
          "Flights",
          ...segments.map(
            (s) =>
              `  ${s.flight} · ${s.dep} → ${s.arr} · ${s.depTime} → ${s.arrTime}`
          ),
        ]
      : []),
    ...(input.summary ? ["", input.summary] : []),
    "",
    "Keep the order number — it is what any airline or agent will ask for.",
    "Ticketing can take a few minutes to finish after payment; the reference above is valid either way.",
  ];

  return parts.join("\n");
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

/** Same content as the text body, styled just enough to read as a ticket. */
const html = (input: {
  order?: unknown;
  orderNo: string;
  pnr?: string;
  summary?: string;
}): string => {
  const { passengers, segments } = describeOrder(input.order);
  const row = (label: string, value: string) =>
    `<tr><td style="padding:4px 16px 4px 0;color:#6b7280;white-space:nowrap">${label}</td><td style="padding:4px 0;font-weight:600">${escapeHtml(value)}</td></tr>`;

  const flightRows = segments
    .map(
      (s) =>
        `<tr><td style="padding:8px 12px;border-top:1px solid #e5e7eb;font-weight:600;white-space:nowrap">${escapeHtml(s.flight)}</td><td style="padding:8px 12px;border-top:1px solid #e5e7eb;white-space:nowrap">${escapeHtml(s.dep)} → ${escapeHtml(s.arr)}</td><td style="padding:8px 12px;border-top:1px solid #e5e7eb">${escapeHtml(s.depTime)} → ${escapeHtml(s.arrTime)}</td></tr>`
    )
    .join("");

  return `<div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">
  <h1 style="font-size:20px;margin:0 0 4px">Your booking is confirmed ✈</h1>
  <p style="margin:0 0 20px;color:#6b7280">Atlas · Flight Guardian</p>
  <table style="border-collapse:collapse;font-size:14px;margin-bottom:20px">
    ${input.pnr ? row("PNR", input.pnr) : ""}
    ${row("Order", input.orderNo)}
    ${passengers.length > 0 ? row(passengers.length > 1 ? "Passengers" : "Passenger", passengers.join(", ")) : ""}
  </table>
  ${
    segments.length > 0
      ? `<table style="border-collapse:collapse;font-size:14px;width:100%;margin-bottom:20px"><thead><tr><th style="text-align:left;padding:8px 12px;color:#6b7280;font-weight:500">Flight</th><th style="text-align:left;padding:8px 12px;color:#6b7280;font-weight:500">Route</th><th style="text-align:left;padding:8px 12px;color:#6b7280;font-weight:500">Times</th></tr></thead><tbody>${flightRows}</tbody></table>`
      : ""
  }
  ${input.summary ? `<p style="font-size:14px">${escapeHtml(input.summary)}</p>` : ""}
  <p style="font-size:13px;color:#6b7280">Keep the order number — it is what any airline or agent will ask for. Ticketing can take a few minutes to finish after payment; the reference above is valid either way.</p>
</div>`;
};

export const sendBookingConfirmation = async (
  context: ToolContext,
  input: {
    order?: unknown;
    orderNo: string;
    pnr?: string;
    recipients: readonly string[];
    summary?: string;
  }
): Promise<{ reason?: string; sent: boolean; to: string[] }> => {
  const to = uniqueEmails(input.recipients);
  try {
    const fromAddress = process.env.RESEND_FROM_ADDRESS;
    const mailer = resend();

    if (to.length === 0) {
      return { reason: "no contact email on the order", sent: false, to: [] };
    }
    if (!fromAddress || !mailer) {
      return { reason: "email sending is not configured", sent: false, to };
    }

    await mailer.emails.send(
      {
        from: fromAddress,
        html: html(input),
        subject: input.pnr
          ? `Booking confirmed — PNR ${input.pnr}`
          : `Booking confirmed — ${input.orderNo}`,
        text: lines(input),
        to: [...to],
      },
      // Paying twice must not mean two confirmations; the order number is the
      // natural key for exactly one email.
      { idempotencyKey: `booking-confirmation/${input.orderNo}` }
    );
    return { sent: true, to };
  } catch (error) {
    // A booking that is paid and ticketed must never fail because an email
    // did not go out. The order number is already on screen and in the panel.
    return { reason: String(error).slice(0, 200), sent: false, to };
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
