import { relations } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";

/**
 * A user-owned trip document. The `content` column stores the Plate.js
 * (Slate) value as JSON so the editor can restore the exact node tree.
 */
export const trip = pgTable(
  "trip",
  {
    content: jsonb("content").$type<unknown>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      /* @__PURE__ */
      .$onUpdate(() => new Date())
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("trip_userId_idx").on(table.userId)]
);

export const tripRelations = relations(trip, ({ one }) => ({
  user: one(user, {
    fields: [trip.userId],
    references: [user.id],
  }),
}));
