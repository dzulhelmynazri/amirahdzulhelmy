import { db } from "@atlas/db";
import { activityAlert } from "@atlas/db/schema/activity";
import { disruptionEvent } from "@atlas/db/schema/disruptions";
import { desc, eq } from "drizzle-orm";

import { protectedProcedure, router } from "../index";
import {
  upcomingDestinationCodes,
  WATCH_HORIZON_DAYS,
} from "../lib/destinations";

/** Enough to fill the card; a board is not an archive. */
const DISRUPTIONS_SHOWN = 20;

export const activityRouter = router({
  /**
   * Disruptions Atlas pushed about this traveller's own orders.
   *
   * Scoped by `userId` rather than by destination: a schedule change belongs
   * to one booking and showing it to anyone else would be a privacy leak, not
   * a courtesy. Rows whose order we do not own carry a null userId and are
   * therefore invisible here by construction.
   */
  disruptions: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select()
      .from(disruptionEvent)
      .where(eq(disruptionEvent.userId, ctx.session.user.id))
      .orderBy(desc(disruptionEvent.detectedAt))
      .limit(DISRUPTIONS_SHOWN);

    return rows.map((row) => ({
      airline: row.airline,
      detectedAt: row.detectedAt.toISOString(),
      eventType: row.eventType,
      handledNote: row.handledNote,
      id: row.id,
      orderNo: row.orderNo,
      pnr: row.pnr,
      status: row.status,
      summary: row.summary,
    }));
  }),

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
