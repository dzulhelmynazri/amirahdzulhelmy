import { relations } from "drizzle-orm";
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";

/**
 * A person this account books flights for — themselves, a partner, a child.
 *
 * Deliberately not agent memory. These are exact, legally significant fields:
 * a misspelt name is a denied boarding, a wrong date of birth is an invalid
 * ticket. They belong somewhere the traveller can see and correct, not in an
 * opaque recall store. Travel document numbers make that doubly true.
 *
 * Agent memory stays the right home for soft preferences — favourite airline,
 * home airport, usual cabin.
 */
export const traveller = pgTable(
  "traveller",
  {
    /** `YYYY-MM-DD`, date-only. No timezone semantics. */
    birthday: text("birthday").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    /** Travel document expiry, `YYYY-MM-DD`. */
    documentExpiry: text("document_expiry"),
    /** Issuing country, ISO-2. */
    documentIssuePlace: text("document_issue_place"),
    documentNumber: text("document_number"),
    email: text("email"),
    /** "F" or "M" — the only values Atlas accepts. */
    gender: text("gender").notNull(),
    id: text("id").primaryKey(),
    /** The default traveller, offered first when booking. */
    isPrimary: boolean("is_primary").notNull().default(false),
    /** Uppercase `FAMILY/GIVEN`, exactly as it appears on the document. */
    name: text("name").notNull(),
    /** Nationality, ISO-2. */
    nationality: text("nationality"),
    phone: text("phone"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      /* @__PURE__ */
      .$onUpdate(() => new Date())
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("traveller_userId_idx").on(table.userId),
    index("traveller_primary_idx").on(table.userId, table.isPrimary),
  ]
);

export const travellerRelations = relations(traveller, ({ one }) => ({
  user: one(user, {
    fields: [traveller.userId],
    references: [user.id],
  }),
}));
