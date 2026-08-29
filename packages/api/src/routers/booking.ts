import { db } from "@atlas/db";
import { booking } from "@atlas/db/schema/booking";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { getAtlasClient } from "../lib/atlas";
import { cachedAtlas, invalidateAtlasOrder } from "../lib/atlas-cache";

/** Page size for the webhook.incidents strip on the booking detail view. */
const INCIDENTS_PAGE_SIZE = 10;

/** Atlas convention: status 0 on a response means the request succeeded. */
const ATLAS_STATUS_OK = 0;

type AtlasClient = Awaited<ReturnType<typeof getAtlasClient>>;

type LifecycleAction = "pay" | "refund" | "void";

interface LifecycleSpec {
  /** Booking-table statuses the action may be run from. */
  allowedStatuses: string[];
  /** Status written back to the booking table after a successful Atlas call. */
  nextStatus: string;
  run: (
    atlas: AtlasClient,
    orderNo: string
  ) => Promise<{ msg: string | null; status: number }>;
  /** Plain verb reused in user-facing error messages. */
  verb: string;
}

const lifecycleSpecs: Record<LifecycleAction, LifecycleSpec> = {
  pay: {
    allowedStatuses: ["created"],
    nextStatus: "issued",
    // paymentMethod 1 = Atlas deposit balance; the field is required by
    // /pay.do — omitting it fails before the order is even looked at.
    run: (atlas, orderNo) =>
      atlas.flights.paymentAndTicketing.pay({ orderNo, paymentMethod: 1 }),
    verb: "pay and issue",
  },
  refund: {
    allowedStatuses: ["issued"],
    nextStatus: "refunded",
    run: (atlas, orderNo) => atlas.postBooking.refunds.create({ orderNo }),
    verb: "refund",
  },
  void: {
    allowedStatuses: ["confirmed", "created"],
    nextStatus: "voided",
    run: (atlas, orderNo) => atlas.postBooking.void.create({ orderNo }),
    verb: "void",
  },
};

const runLifecycleAction = async (
  action: LifecycleAction,
  orderNo: string,
  userId: string
) => {
  const spec = lifecycleSpecs[action];

  const [row] = await db
    .select()
    .from(booking)
    .where(and(eq(booking.orderNo, orderNo), eq(booking.userId, userId)))
    .limit(1);

  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
  }
  if (!spec.allowedStatuses.includes(row.status)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Cannot ${spec.verb} a booking with status "${row.status}".`,
    });
  }

  const atlas = await getAtlasClient();
  // In-flight dedup stops a double click from paying or voiding twice.
  const result = await cachedAtlas(`${action}:${orderNo}`, () =>
    spec.run(atlas, orderNo)
  );

  if (result.status !== ATLAS_STATUS_OK) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        result.msg ??
        `Atlas could not ${spec.verb} this order (status ${result.status}).`,
    });
  }

  await db
    .update(booking)
    .set({ status: spec.nextStatus, updatedAt: new Date() })
    .where(eq(booking.orderNo, orderNo));

  // Cached live lookups for this order are stale after a lifecycle change.
  invalidateAtlasOrder(orderNo);

  return { status: spec.nextStatus };
};

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

  pay: protectedProcedure
    .input(z.object({ orderNo: z.string().min(1) }))
    .mutation(({ ctx, input }) =>
      runLifecycleAction("pay", input.orderNo, ctx.session.user.id)
    ),

  refund: protectedProcedure
    .input(z.object({ orderNo: z.string().min(1) }))
    .mutation(({ ctx, input }) =>
      runLifecycleAction("refund", input.orderNo, ctx.session.user.id)
    ),

  void: protectedProcedure
    .input(z.object({ orderNo: z.string().min(1) }))
    .mutation(({ ctx, input }) =>
      runLifecycleAction("void", input.orderNo, ctx.session.user.id)
    ),
});
