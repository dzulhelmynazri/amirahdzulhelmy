import { desc, eq } from "drizzle-orm";

const ALERT_CATEGORIES = [
  "health",
  "political",
  "safety",
  "transit",
  "weather",
] as const;

const ALERT_SEVERITIES = ["critical", "high", "low", "medium"] as const;

const ALERT_STATUSES = ["active", "resolved", "superseded"] as const;

export type AlertCategory = (typeof ALERT_CATEGORIES)[number];
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];
export type AlertStatus = (typeof ALERT_STATUSES)[number];

export { ALERT_CATEGORIES, ALERT_SEVERITIES, ALERT_STATUSES };

export interface ActivityAlertInput {
  category: AlertCategory;
  countryCode: string;
  destination: string;
  latitude: number;
  longitude: number;
  severity: AlertSeverity;
  source: string;
  status: AlertStatus;
  summary: string;
}

export interface ActivityAlertRecord extends ActivityAlertInput {
  detectedAt: Date;
  id: string;
}

export const listActivityAlerts = async (input?: {
  destination?: string;
  limit?: number;
}): Promise<ActivityAlertRecord[]> => {
  const { db } = await import("@atlas/db");
  const { activityAlert } = await import("@atlas/db/schema/activity");

  const limit = input?.limit ?? 50;
  const rows = input?.destination
    ? await db
        .select()
        .from(activityAlert)
        .where(eq(activityAlert.destination, input.destination))
        .orderBy(desc(activityAlert.detectedAt))
        .limit(limit)
    : await db
        .select()
        .from(activityAlert)
        .orderBy(desc(activityAlert.detectedAt))
        .limit(limit);

  return rows.map((row) => ({
    category: row.category as AlertCategory,
    countryCode: row.countryCode,
    destination: row.destination,
    detectedAt: row.detectedAt,
    id: row.id,
    latitude: row.latitude,
    longitude: row.longitude,
    severity: row.severity as AlertSeverity,
    source: row.source,
    status: row.status as AlertStatus,
    summary: row.summary,
  }));
};

/**
 * An alert already on the board for the same source URL, if there is one.
 *
 * One article is one event. The schedule used to hand deduplication to the
 * model — "skip any you find there" — and on its first real run it posted the
 * same Seoul heat warning twice from the same Korea Herald URL, once as
 * medium and once as high. Two rows, one event, and a dashboard that counts
 * wrong.
 *
 * Judging sameness from two summaries is exactly the work a model is bad at
 * and a string comparison is perfect at, so it happens here instead.
 */
const existingAlertForSource = async (source: string) => {
  const { db } = await import("@atlas/db");
  const { activityAlert } = await import("@atlas/db/schema/activity");
  const { eq: matches } = await import("drizzle-orm");

  const [row] = await db
    .select({ id: activityAlert.id, severity: activityAlert.severity })
    .from(activityAlert)
    .where(matches(activityAlert.source, source))
    .limit(1);

  return row;
};

/** Raised when the board already carries this event. */
export class DuplicateAlertError extends Error {
  readonly existingId: string;

  constructor(existingId: string) {
    super(
      `An alert citing this source is already on the board (${existingId}). Do not report it again.`
    );
    this.name = "DuplicateAlertError";
    this.existingId = existingId;
  }
}

export const persistActivityAlert = async (
  input: ActivityAlertInput
): Promise<ActivityAlertRecord> => {
  const { db } = await import("@atlas/db");
  const { activityAlert } = await import("@atlas/db/schema/activity");

  const duplicate = await existingAlertForSource(input.source);

  if (duplicate) {
    throw new DuplicateAlertError(duplicate.id);
  }

  const id = crypto.randomUUID();
  const [row] = await db
    .insert(activityAlert)
    .values({
      category: input.category,
      countryCode: input.countryCode,
      destination: input.destination,
      id,
      latitude: input.latitude,
      longitude: input.longitude,
      severity: input.severity,
      source: input.source,
      status: input.status,
      summary: input.summary,
    })
    .returning();

  if (!row) {
    throw new Error("Could not save the activity alert.");
  }

  return {
    category: row.category as AlertCategory,
    countryCode: row.countryCode,
    destination: row.destination,
    detectedAt: row.detectedAt,
    id: row.id,
    latitude: row.latitude,
    longitude: row.longitude,
    severity: row.severity as AlertSeverity,
    source: row.source,
    status: row.status as AlertStatus,
    summary: row.summary,
  };
};
