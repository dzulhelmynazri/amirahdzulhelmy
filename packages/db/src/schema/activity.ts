import {
  doublePrecision,
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Destination intelligence posted by travel-sentinel.
 *
 * Rows stay global on purpose. A haze advisory over Singapore is one fact, not
 * one fact per traveller, so it is stored once and shown to whoever it
 * concerns. `/activity` decides that at read time by matching
 * `destinationCode` against the places the viewer is actually flying to.
 */
export const activityAlert = pgTable(
  "activity_alert",
  {
    category: text("category").notNull(),
    countryCode: text("country_code").notNull(),
    destination: text("destination").notNull(),
    /**
     * IATA code, and the only thing the trip filter matches on.
     *
     * `destination` is a display string — "Singapore, SG" — and joining a
     * booking to an alert by comparing those was never going to hold. Nullable
     * because rows written before this column existed have no code; those are
     * treated as unmatchable rather than shown to everybody.
     */
    destinationCode: text("destination_code"),
    detectedAt: timestamp("detected_at").defaultNow().notNull(),
    id: text("id").primaryKey(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    severity: text("severity").notNull(),
    source: text("source").notNull(),
    status: text("status").notNull().default("active"),
    summary: text("summary").notNull(),
  },
  (table) => [
    index("activity_alert_detectedAt_idx").on(table.detectedAt),
    index("activity_alert_destination_idx").on(table.destination),
  ]
);
