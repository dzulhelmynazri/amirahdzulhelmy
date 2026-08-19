import { db } from "@atlas/db";
import { booking } from "@atlas/db/schema/booking";
import { desc, eq } from "drizzle-orm";

import { protectedProcedure, router } from "../index";

export const bookingRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    db
      .select()
      .from(booking)
      .where(eq(booking.userId, ctx.session.user.id))
      .orderBy(desc(booking.createdAt))
  ),
});
