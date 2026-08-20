import { db } from "@atlas/db";
import { trip } from "@atlas/db/schema/trips";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

export const tripsRouter = router({
  create: protectedProcedure
    .input(z.object({ title: z.string().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const id = crypto.randomUUID();
      const [row] = await db
        .insert(trip)
        .values({
          id,
          title: input.title,
          userId: ctx.session.user.id,
        })
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create trip",
        });
      }

      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .delete(trip)
        .where(and(eq(trip.id, input.id), eq(trip.userId, ctx.session.user.id)))
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trip not found",
        });
      }

      return row;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [row] = await db
        .select()
        .from(trip)
        .where(and(eq(trip.id, input.id), eq(trip.userId, ctx.session.user.id)))
        .limit(1);

      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trip not found",
        });
      }

      return row;
    }),

  list: protectedProcedure.query(({ ctx }) =>
    db
      .select()
      .from(trip)
      .where(eq(trip.userId, ctx.session.user.id))
      .orderBy(desc(trip.createdAt))
  ),

  update: protectedProcedure
    .input(
      z.object({
        content: z.unknown().optional(),
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const values: Partial<typeof trip.$inferInsert> = {};
      if (input.title !== undefined) {
        values.title = input.title;
      }
      if (input.content !== undefined) {
        values.content = input.content;
      }

      const [row] = await db
        .update(trip)
        .set(values)
        .where(and(eq(trip.id, input.id), eq(trip.userId, ctx.session.user.id)))
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trip not found",
        });
      }

      return row;
    }),
});
