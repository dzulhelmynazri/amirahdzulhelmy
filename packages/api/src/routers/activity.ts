import { db } from "@atlas/db";
import { activityAlert } from "@atlas/db/schema/activity";
import { desc } from "drizzle-orm";

import { protectedProcedure, router } from "../index";
import {
  upcomingDestinationCodes,
  WATCH_HORIZON_DAYS,
} from "../lib/destinations";

export const activityRouter = router({
  /**
   * Destination alerts, narrowed to places this traveller is actually flying.
   *
   * Rows are stored globally — a haze advisory over Singapore is one fact, not
   * one per person — so the narrowing happens here, by matching the alert's
   * IATA code against the codes their own bookings reach.
   *
   * It used to return everything. The board carried Seoul, Bali and Bangkok
   * for an account whose only trip was Kuala Lumpur to Singapore, and a row
   * that cannot concern you teaches you that none of them do.
   *
   * `watching` is returned so the page can say why a board is empty. No
   * upcoming trips and nothing worth reporting look identical otherwise, and
   * only one of them is a reason to keep checking.
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const [rows, codes] = await Promise.all([
      db.select().from(activityAlert).orderBy(desc(activityAlert.detectedAt)),
      upcomingDestinationCodes(ctx.session.user.id),
    ]);

    const mine = rows.filter(
      // Rows written before `destinationCode` existed cannot be matched to a
      // trip. Unmatchable is treated as not-mine rather than shown to all.
      (row) => row.destinationCode && codes.has(row.destinationCode)
    );

    return {
      alerts: mine.map((row) => ({
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
      })),
      horizonDays: WATCH_HORIZON_DAYS,
      watching: [...codes].toSorted(),
    };
  }),
});
