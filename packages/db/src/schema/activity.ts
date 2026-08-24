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
 * The `/activity` dashboard reads this table. Rows are global — they describe
 * what the agent is watching, not a single traveller's inbox.
 */
export const activityAlert = pgTable(
  "activity_alert",
  {
    category: text("category").notNull(),
    countryCode: text("country_code").notNull(),
    destination: text("destination").notNull(),
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
