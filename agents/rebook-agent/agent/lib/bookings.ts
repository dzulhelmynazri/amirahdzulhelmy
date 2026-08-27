import type { ToolContext } from "eve/tools";

interface BookingEvent {
  currency: string | null;
  orderNo: string | null;
  payload: Record<string, unknown>;
  pnr: string | null;
  totalAmount: string | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const firstString = (
  record: Record<string, unknown>,
  keys: readonly string[]
): string | null => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return null;
};

const extractPnr = (record: Record<string, unknown>): string | null => {
  const direct = firstString(record, ["pnr", "PNR", "pnrCode"]);
  if (direct) {
    return direct;
  }
  const { pnrList } = record;
  if (Array.isArray(pnrList) && pnrList.length > 0) {
    const [first] = pnrList;
    if (typeof first === "string") {
      return first;
    }
    if (isRecord(first)) {
      return firstString(first, ["pnr", "PNR"]);
    }
  }
  return null;
};

const extractEvent = (
  result: unknown,
  fallbackOrderNo: string | undefined
): BookingEvent | null => {
  if (!isRecord(result)) {
    return null;
  }
  return {
    currency: firstString(result, [
      "currency",
      "displayCurrency",
      "payCurrency",
    ]),
    orderNo:
      firstString(result, ["orderId", "orderNo"]) ?? fallbackOrderNo ?? null,
    payload: result,
    pnr: extractPnr(result),
    totalAmount: firstString(result, [
      "amount",
      "orderPrice",
      "payAmount",
      "totalAmount",
      "totalPrice",
    ]),
  };
};

/**
 * Works out whose booking this is.
 *
 * In the browser better-auth supplies a real user id. `eve dev` has no cookie,
 * so the session falls back to `local-dev` with nobody attached — and a booking
 * saved with a null `userId` never appears on the bookings page, which reads as
 * the booking having failed when it actually succeeded.
 *
 * `ATLAS_DEV_USER_ID` covers that case only. It has to be set by hand in a
 * local `.env` and is never consulted when a verified user is present, so it
 * cannot widen attribution in production.
 */
const resolveAttribution = (
  context: ToolContext
): { principalId: string | null; userId: string | null } => {
  const auth = context.session.auth.current ?? context.session.auth.initiator;
  const isBetterAuthUser = auth?.authenticator.toLowerCase().includes("better");

  if (isBetterAuthUser && auth) {
    return { principalId: auth.principalId, userId: auth.principalId };
  }

  return {
    principalId: auth?.principalId ?? null,
    userId: process.env.ATLAS_DEV_USER_ID ?? null,
  };
};

/**
 * Writes what a tool learned about an order.
 *
 * `status` may be null, meaning "do not touch the stored status". Read-only
 * lookups use that: `queryOrderDetails` returns a numeric `orderStatus` whose
 * enum is undocumented, and guessing it could downgrade an issued booking. The
 * snapshot, PNR and totals are still worth keeping.
 *
 * `enrichOnly` updates a booking this caller already owns and never creates
 * one. A lookup takes whatever order number it is handed, so without it a
 * traveller who named someone else's order would have that booking written
 * into their own account and listed as theirs.
 */
export const persistBooking = async (
  context: ToolContext,
  status: string | null,
  result: unknown,
  fallbackOrderNo?: string,
  options?: { enrichOnly?: boolean }
): Promise<void> => {
  try {
    const event = extractEvent(result, fallbackOrderNo);
    const orderNo = event?.orderNo;
    if (!event || !orderNo) {
      return;
    }

    const { db } = await import("@atlas/db");
    const { booking } = await import("@atlas/db/schema/booking");

    const { principalId, userId } = resolveAttribution(context);
    const fields: Partial<typeof booking.$inferInsert> = {
      payload: event.payload,
    };
    if (event.currency) {
      fields.currency = event.currency;
    }
    if (event.pnr) {
      fields.pnr = event.pnr;
    }
    if (event.totalAmount) {
      fields.totalAmount = event.totalAmount;
    }
    if (principalId) {
      fields.principalId = principalId;
    }
    if (userId) {
      fields.userId = userId;
    }

    const changes = {
      ...fields,
      updatedAt: new Date(),
      ...(status === null ? {} : { status }),
    };

    if (options?.enrichOnly) {
      const { and, eq } = await import("drizzle-orm");

      // Scoped to the owner as well as the order number. An order this caller
      // does not already have matches nothing, so the lookup enriches their
      // own booking or writes nothing at all.
      if (!userId) {
        return;
      }

      await db
        .update(booking)
        .set(changes)
        .where(and(eq(booking.orderNo, orderNo), eq(booking.userId, userId)));
      return;
    }

    await db
      .insert(booking)
      .values({ ...fields, orderNo, status: status ?? "created" })
      .onConflictDoUpdate({ set: changes, target: booking.orderNo });
  } catch {
    // Best effort: a failed booking write must never fail the booking itself.
  }
};
