import { db } from "@atlas/db";
import { booking } from "@atlas/db/schema/booking";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { getAtlasClient } from "../lib/atlas";
import { cachedAtlas } from "../lib/atlas-cache";

/** Page size for the webhook.incidents strip on the booking detail view. */
const INCIDENTS_PAGE_SIZE = 10;

export const bookingRouter = router({
  details: protectedProcedure
    .input(z.object({ orderNo: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [row] = await db
        .select()
        .from(booking)
        .where(
          and(
            eq(booking.orderNo, input.orderNo),
            eq(booking.userId, ctx.session.user.id)
          )
        )
        .limit(1);

      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking not found",
        });
      }

      try {
        const atlas = await getAtlasClient();
        const live = await cachedAtlas(`queryOrder:${input.orderNo}`, () =>
          atlas.flights.queryOrder.query({ orderNo: input.orderNo })
        );

        return { booking: row, live, liveError: null };
      } catch (error) {
        console.error("Atlas queryOrder failed", error);

        return {
          booking: row,
          live: null,
          liveError: "Unable to fetch live booking status",
        };
      }
    }),

  incidents: protectedProcedure
    .input(z.object({ orderNo: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [row] = await db
        .select({ orderNo: booking.orderNo })
        .from(booking)
        .where(
          and(
            eq(booking.orderNo, input.orderNo),
            eq(booking.userId, ctx.session.user.id)
          )
        )
        .limit(1);

      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking not found",
        });
      }

      try {
        const atlas = await getAtlasClient();
        const response = await cachedAtlas(`incidents:${input.orderNo}`, () =>
          atlas.webhook.incidents({
            orderNo: input.orderNo,
            pageSize: INCIDENTS_PAGE_SIZE,
          })
        );

        return {
          incidents: Array.isArray(response.records) ? response.records : [],
          incidentsError: null,
        };
      } catch (error) {
        console.error("Atlas webhook incidents failed", error);

        return {
          incidents: [],
          incidentsError: "Unable to fetch disruption incidents",
        };
      }
    }),

  list: protectedProcedure.query(({ ctx }) =>
    db
      .select()
      .from(booking)
      .where(eq(booking.userId, ctx.session.user.id))
      .orderBy(desc(booking.createdAt))
  ),
});
