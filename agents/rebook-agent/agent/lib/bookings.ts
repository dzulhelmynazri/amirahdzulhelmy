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
  const direct = firstString(record, ["pnr", "PNR"]);
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

const resolveAttribution = (
  context: ToolContext
): { principalId: string | null; userId: string | null } => {
  const auth = context.session.auth.current ?? context.session.auth.initiator;
  if (!auth) {
    return { principalId: null, userId: null };
  }
  const isBetterAuthUser = auth.authenticator.toLowerCase().includes("better");
  return {
    principalId: auth.principalId,
    userId: isBetterAuthUser ? auth.principalId : null,
  };
};

export const persistBooking = async (
  context: ToolContext,
  status: string,
  result: unknown,
  fallbackOrderNo?: string
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

    await db
      .insert(booking)
      .values({ ...fields, orderNo, status })
      .onConflictDoUpdate({
        set: { ...fields, status, updatedAt: new Date() },
        target: booking.orderNo,
      });
  } catch {
    // Best effort: a failed booking write must never fail the booking itself.
  }
};
