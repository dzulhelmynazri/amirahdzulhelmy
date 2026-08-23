/**
 * Seeds the booking table with demo orders for the first registered user.
 * Rows are upserted by Atlas order number, matching how the booking-agent
 * persists orders, so rerunning this script is safe.
 *
 * Usage: bun scripts/seed-bookings.ts
 */
import { db } from "@atlas/db";
import { user } from "@atlas/db/schema/auth";
import { booking } from "@atlas/db/schema/booking";

import { seedBookings } from "./seed-bookings-data";

const main = async () => {
  const [targetUser] = await db.select({ id: user.id }).from(user).limit(1);
  if (!targetUser) {
    console.error(
      "No users found. Sign in to the app once so a user row exists, then rerun."
    );
    process.exit(1);
  }

  await Promise.all(
    seedBookings.map((row) => {
      const fields = {
        currency: row.currency,
        payload: row.payload,
        pnr: row.pnr,
        status: row.status,
        totalAmount: row.totalAmount,
        userId: targetUser.id,
      };
      return db
        .insert(booking)
        .values({
          ...fields,
          createdAt: new Date(row.createdAt),
          orderNo: row.orderNo,
        })
        .onConflictDoUpdate({
          set: { ...fields, updatedAt: new Date() },
          target: booking.orderNo,
        });
    })
  );

  console.log(
    `Seeded ${seedBookings.length} bookings for user ${targetUser.id}`
  );
};

await main();
