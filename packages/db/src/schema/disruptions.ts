import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * A disruption Atlas told us about: a schedule change, a cancellation, a
 * ticketing event on somebody's order.
 *
 * Separate from `activity_alert` because the two answer different questions.
 * An activity alert is about a *place* — a typhoon over Manila concerns
 * everyone flying there. A disruption is about *one order*: it has an owner,
 * and showing it to anyone else would be a privacy leak rather than a
 * courtesy.
 *
 * Written by the webhook receiver before any model runs. That ordering is
 * deliberate: the record of what the airline said must survive an agent that
 * fails, times out, or is not configured at all.
 */
export const disruptionEvent = pgTable(
  "disruption_event",
  {
    /** Airline IATA, when Atlas names one. */
    airline: text("airline"),
    detectedAt: timestamp("detected_at").defaultNow().notNull(),
    /** Atlas's own event id. Unique — the same push arriving twice is one event. */
    eventId: text("event_id").notNull().unique(),
    /** Atlas event type, e.g. `order.schedulechange`, `abnormal.cancelled`. */
    eventType: text("event_type").notNull(),
    /** What the agent worked out and proposed, once it has run. */
    handledNote: text("handled_note"),
    id: text("id").primaryKey(),
    orderNo: text("order_no").notNull(),
    /** The raw push, kept whole so a parsing mistake is never a data loss. */
    payload: jsonb("payload").$type<unknown>(),
    pnr: text("pnr"),
    /** "received" | "reviewed" | "resolved". */
    status: text("status").notNull().default("received"),
    /** One line a human can read without opening the payload. */
    summary: text("summary").notNull(),
    /**
     * Resolved from the booking that owns `orderNo`, so the row can be scoped
     * to one traveller. Null when the order is not ours — an event Atlas sent
     * for an order created outside this app — which is kept rather than
     * dropped, because a mystery event is still evidence.
     */
    userId: text("user_id"),
  },
  (table) => [
    index("disruption_event_orderNo_idx").on(table.orderNo),
    index("disruption_event_userId_idx").on(table.userId),
    index("disruption_event_detectedAt_idx").on(table.detectedAt),
  ]
);
