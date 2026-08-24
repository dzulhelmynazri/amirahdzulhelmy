import { db } from "@atlas/db";
import { activityAlert } from "@atlas/db/schema/activity";
import { desc } from "drizzle-orm";

import { protectedProcedure, router } from "../index";

export const activityRouter = router({
  /**
   * Destination alerts posted by travel-sentinel. Global — the dashboard
   * shows what the agent is watching, not a per-user inbox.
   */
  list: protectedProcedure.query(async () => {
    const rows = await db
      .select()
      .from(activityAlert)
      .orderBy(desc(activityAlert.detectedAt));

    return rows.map((row) => ({
      category: row.category,
      countryCode: row.countryCode,
      destination: row.destination,
      detectedAt: row.detectedAt.toISOString(),
      id: row.id,
      latitude: row.latitude,
      longitude: row.longitude,
      severity: row.severity,
      source: row.source,
      status: row.status,
      summary: row.summary,
    }));
  }),
});
