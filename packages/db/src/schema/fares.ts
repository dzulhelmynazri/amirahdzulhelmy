import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

/**
 * One fare search a traveller ran on `/fares`.
 *
 * Stores the criteria and how many results came back — not the fares
 * themselves. It exists so the page can offer "recent searches" instead of
 * making people retype, and so we can see which routes people actually want.
 */
export const fareSearch = pgTable(
  "fare_search",
  {
    adults: integer("adults").notNull().default(1),
    cabin: text("cabin").notNull(),
    children: integer("children").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    /** Settlement currency the search was priced in. */
    currency: text("currency").notNull(),
    /** Stored as a date-only string (`YYYY-MM-DD`) — no timezone semantics. */
    departureDate: text("departure_date").notNull(),
    destination: text("destination").notNull(),
    id: text("id").primaryKey(),
    infants: integer("infants").notNull().default(0),
    origin: text("origin").notNull(),
    /** Atlas request id, for tracing a specific search back to the provider. */
    requestId: text("request_id"),
    /** How many fares came back. Zero is a useful signal, not a failure. */
    resultCount: integer("result_count").notNull().default(0),
    returnDate: text("return_date"),
    /** "one-way" | "round-trip". */
    tripType: text("trip_type").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("fare_search_userId_idx").on(table.userId),
    index("fare_search_createdAt_idx").on(table.createdAt),
    index("fare_search_route_idx").on(table.origin, table.destination),
  ]
);

/**
 * A fare a traveller kept from a search.
 *
 * This is a **snapshot, not a bookable offer**. `routingIdentifier` carries an
 * `expireTime` on the Atlas side, so a saved row goes stale: always re-search
 * and verify before booking. `priceAtSave` is kept so we can show whether the
 * fare has moved since.
 */
export const savedFare = pgTable(
  "saved_fare",
  {
    airline: text("airline").notNull(),
    /** True when the fare included checked baggage at save time. */
    baggageIncluded: boolean("baggage_included").notNull().default(false),
    cabin: text("cabin"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    currency: text("currency").notNull(),
    /** Space-separated flight numbers, e.g. "AK701 AK702". */
    flightNumbers: text("flight_numbers").notNull(),
    id: text("id").primaryKey(),
    /** Total per adult at save time: base + tax + per-pax transaction fee. */
    priceAtSave: numeric("price_at_save", {
      precision: 12,
      scale: 2,
    }).notNull(),
    /** Opaque Atlas token. Expires — never treat it as durable. */
    routingIdentifier: text("routing_identifier"),
    /** Which search produced it, so the criteria can be replayed. */
    searchId: text("search_id").references(() => fareSearch.id, {
      onDelete: "set null",
    }),
    stops: integer("stops").notNull().default(0),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("saved_fare_userId_idx").on(table.userId),
    index("saved_fare_searchId_idx").on(table.searchId),
  ]
);

export const fareSearchRelations = relations(fareSearch, ({ many, one }) => ({
  savedFares: many(savedFare),
  user: one(user, {
    fields: [fareSearch.userId],
    references: [user.id],
  }),
}));

export const savedFareRelations = relations(savedFare, ({ one }) => ({
  search: one(fareSearch, {
    fields: [savedFare.searchId],
    references: [fareSearch.id],
  }),
  user: one(user, {
    fields: [savedFare.userId],
    references: [user.id],
  }),
}));
