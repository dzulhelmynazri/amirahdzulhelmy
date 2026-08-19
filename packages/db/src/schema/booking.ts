import { relations } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";

/**
 * One row per Atlas order, upserted by the agent as the order moves through
 * its lifecycle (created -> confirmed -> issued, or refunded/voided).
 * Persistence is best effort: a failed write never blocks the booking flow.
 */
export const booking = pgTable(
  "booking",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    currency: text("currency"),
    // The Atlas order number is the natural primary key.
    orderNo: text("order_no").primaryKey(),
    // Best-effort snapshot of the raw API response at the latest lifecycle event.
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    pnr: text("pnr"),
    // Identity of the channel principal that drove the latest event, kept when
    // the principal cannot be mapped to a user row (e.g. a Telegram chat id).
    principalId: text("principal_id"),
    status: text("status").notNull(),
    totalAmount: text("total_amount"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      /* @__PURE__ */
      .$onUpdate(() => new Date())
      .notNull(),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
  },
  (table) => [index("booking_userId_idx").on(table.userId)]
);

export const bookingRelations = relations(booking, ({ one }) => ({
  user: one(user, {
    fields: [booking.userId],
    references: [user.id],
  }),
}));
