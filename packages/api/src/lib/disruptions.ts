import { db } from "@atlas/db";
import { booking } from "@atlas/db/schema/booking";
import { disruptionEvent } from "@atlas/db/schema/disruptions";
import { eq } from "drizzle-orm";

/**
 * Persistence for disruptions Atlas pushes to us.
 *
 * The receiving route writes the row before any agent runs. That ordering is
 * the point: what the airline said must survive an agent that fails, times
 * out, or is not configured at all. The record is evidence; the agent's note
 * on top of it is commentary.
 */

export interface AtlasDisruptionPush {
  airline?: string | null;
  eventId?: string | null;
  eventType?: string | null;
  extraInfo?: string | null;
  orderNo?: string | null;
  pnr?: string | null;
  [key: string]: unknown;
}

const SUMMARY_LIMIT = 500;

/** Atlas's event type codes, in words a traveller can read. */
const EVENT_LABELS: Record<string, string> = {
  "abnormal.cancelled": "Flight cancelled",
  "email.schedulechange": "Schedule change reported by the airline",
  "order.schedulechange": "Schedule change",
};

export const describeDisruption = (event: AtlasDisruptionPush): string => {
  const label = EVENT_LABELS[event.eventType ?? ""] ?? "Airline event";
  const carrier = event.airline ? ` on ${event.airline}` : "";
  const detail = event.extraInfo ? ` — ${event.extraInfo}` : "";
  return `${label}${carrier}${detail}`.slice(0, SUMMARY_LIMIT);
};

/**
 * Writes the event and resolves its owner from the booking it names.
 *
 * Returns null when the push carries no event id or order number: without
 * either there is nothing to key on and nothing to attach it to, and a row
 * that cannot be deduplicated is worse than no row. Also null on a duplicate,
 * which is an ordinary outcome — Atlas delivery is best-effort and retries.
 */
export const recordDisruption = async (
  event: AtlasDisruptionPush
): Promise<{ id: string; userId: string | null } | null> => {
  const eventId = event.eventId?.trim();
  const orderNo = event.orderNo?.trim();

  if (!(eventId && orderNo)) {
    return null;
  }

  const [owner] = await db
    .select({ userId: booking.userId })
    .from(booking)
    .where(eq(booking.orderNo, orderNo))
    .limit(1);

  const [row] = await db
    .insert(disruptionEvent)
    .values({
      airline: event.airline ?? null,
      eventId,
      eventType: event.eventType ?? "unknown",
      id: crypto.randomUUID(),
      orderNo,
      payload: event,
      pnr: event.pnr ?? null,
      summary: describeDisruption(event),
      userId: owner?.userId ?? null,
    })
    .onConflictDoNothing({ target: disruptionEvent.eventId })
    .returning({ id: disruptionEvent.id });

  return row ? { id: row.id, userId: owner?.userId ?? null } : null;
};
