/**
 * Fires a disruption at our own webhook, exactly as Atlas would.
 *
 * The sandbox incident feed is permanently empty — `/event/getPageList.do`
 * returns `total: 0` for every order — so there is no way to see the receiver,
 * the agent, or the Activity board do their jobs without pushing an event
 * ourselves. This is that push: a real HTTP request to the real route, with a
 * real order number, going through the same code an airline event would.
 *
 *   bun run --filter web disruption:simulate -- <orderNo>
 *
 * It does not fake a disruption at the airline. It exercises our half.
 */

const orderNoArg = process.argv.at(2);

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
const token = process.env.ATLAS_WEBHOOK_TOKEN;

if (!token) {
  process.stderr.write(
    "ATLAS_WEBHOOK_TOKEN is not set — the receiver will refuse this.\n"
  );
  process.exit(1);
}

const resolveOrderNo = async (): Promise<string | null> => {
  if (orderNoArg) {
    return orderNoArg;
  }

  const { db } = await import("@atlas/db");
  const { booking } = await import("@atlas/db/schema/booking");
  const { desc, isNotNull } = await import("drizzle-orm");

  const [row] = await db
    .select({ orderNo: booking.orderNo })
    .from(booking)
    .where(isNotNull(booking.userId))
    .orderBy(desc(booking.createdAt))
    .limit(1);

  return row?.orderNo ?? null;
};

const orderNo = await resolveOrderNo();

if (!orderNo) {
  process.stderr.write(
    "No booking with an owner to disrupt. Book something first, or pass an order number.\n"
  );
  process.exit(1);
}

const event = {
  airline: "TR",
  // Unique per run: the receiver deduplicates on this, by design.
  eventId: `EVT-SIM-${Date.now()}`,
  eventType: "order.schedulechange",
  extraInfo:
    "Departure moved 3h 25m later; the airline has released seats on the following morning service.",
  orderNo,
};

const response = await fetch(
  `${baseUrl}/api/webhooks/atlas?token=${encodeURIComponent(token)}`,
  {
    body: JSON.stringify(event),
    headers: { "content-type": "application/json" },
    method: "POST",
  }
);

const body = await response.text();
process.stdout.write(`${response.status} ${body}\norder ${orderNo}\n`);
process.exit(response.ok ? 0 : 1);
