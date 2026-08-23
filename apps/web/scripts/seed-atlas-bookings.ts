/**
 * Seeds the booking table with real Atlas sandbox orders: searches live
 * routes, creates and pays one order per route, then upserts the queryOrder
 * snapshot for each. Real order numbers let the webhook.incidents strip on
 * the booking detail sheet surface disruption events as the sandbox emits
 * them for these flights.
 *
 * Extra order numbers passed as CLI args (e.g. bookings made earlier by
 * hand) are queried and upserted too.
 *
 * Usage: bun scripts/seed-atlas-bookings.ts [orderNo ...]
 */
import { getAtlasClient } from "@atlas/api/lib/atlas";
import { db } from "@atlas/db";
import { user } from "@atlas/db/schema/auth";
import { booking } from "@atlas/db/schema/booking";
import { like } from "drizzle-orm";

/** Demo passenger and contact used for every sandbox order this script creates. */
const CONTACT = {
  email: "amirah@example.com",
  mobile: "0060-123456789",
  name: "DZULKIFLI/AMIRAH",
};

const PASSENGER = {
  birthday: "19950615",
  gender: "F",
  name: "DZULKIFLI/AMIRAH",
  passengerType: 0,
};

/** One-way routes booked into the sandbox so incidents can accrue. */
const SEED_ROUTES: { daysAhead: number; from: string; to: string }[] = [
  { daysAhead: 1, from: "KUL", to: "SIN" },
  { daysAhead: 1, from: "KUL", to: "PEN" },
  { daysAhead: 2, from: "KUL", to: "BKK" },
  { daysAhead: 3, from: "KUL", to: "DPS" },
  { daysAhead: 4, from: "KUL", to: "SGN" },
  { daysAhead: 6, from: "KUL", to: "ICN" },
];

/** Airport metadata for the routes above; unknown codes fall back to the code. */
const AIRPORTS: Record<string, { city: string; country: string }> = {
  BKK: { city: "Bangkok", country: "TH" },
  DPS: { city: "Denpasar", country: "ID" },
  ICN: { city: "Seoul", country: "KR" },
  KUL: { city: "Kuala Lumpur", country: "MY" },
  PEN: { city: "Penang", country: "MY" },
  SGN: { city: "Ho Chi Minh City", country: "VN" },
  SIN: { city: "Singapore", country: "SG" },
};

/** Airline names for carrier codes the seed routes commonly return. */
const AIRLINES: Record<string, string> = {
  AK: "AirAsia",
  CA: "Air China",
  CI: "China Airlines",
  CX: "Cathay Pacific",
  FY: "Firefly",
  GA: "Garuda Indonesia",
  KE: "Korean Air",
  MH: "Malaysia Airlines",
  OD: "Batik Air Malaysia",
  OZ: "Asiana Airlines",
  SQ: "Singapore Airlines",
  TG: "Thai Airways",
  TR: "Scoot",
  VJ: "VietJet Air",
  VN: "Vietnam Airlines",
};

const PASSENGER_TYPES: Record<number, "adult" | "child" | "infant"> = {
  0: "adult",
  1: "child",
  2: "infant",
};

/** Atlas queryOrder fields this script consumes. */
export interface AtlasOrder {
  createdTime: string | null;
  currency: string | null;
  orderNo: string;
  orderStatus: string | null;
  payTime: string | null;
  paxTicketInfos:
    | {
        name: string;
        passengerType: number;
        ticketNos: string[];
      }[]
    | null;
  pnrCode: string | null;
  routing: {
    fromSegments: {
      arrAirport: string;
      arrTime: string;
      carrier: string;
      depAirport: string;
      depTime: string;
      flightNumber: string;
    }[];
  } | null;
  totalPrice: number | null;
  updatedTime: string | null;
}

type AtlasClient = Awaited<ReturnType<typeof getAtlasClient>>;

const dayOffset = (days: number): string =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

/** "202608240815" -> "2026-08-24T08:15:00". */
const toIsoDateTime = (compact: string): string =>
  `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}T${compact.slice(8, 10)}:${compact.slice(10, 12)}:00`;

const toAirport = (code: string) => ({
  city: AIRPORTS[code]?.city ?? code,
  code,
  country: AIRPORTS[code]?.country ?? "",
});

const toBookingStatus = (
  order: AtlasOrder
): "confirmed" | "created" | "issued" => {
  const ticketed = (order.paxTicketInfos ?? []).some(
    (pax) => (pax.ticketNos ?? []).length > 0
  );
  if (ticketed) {
    return "issued";
  }
  return order.payTime ? "confirmed" : "created";
};

/** Snapshot matching the payload shape the booking UI extracts (types/bookings.ts). */
const toPayload = (order: AtlasOrder): Record<string, unknown> => ({
  displayCurrency: order.currency ?? "USD",
  orderId: order.orderNo,
  passengers: (order.paxTicketInfos ?? []).map((pax) => ({
    name: pax.name,
    type: PASSENGER_TYPES[pax.passengerType] ?? "adult",
  })),
  pnrList: order.pnrCode ? [order.pnrCode] : [],
  segments: (order.routing?.fromSegments ?? []).map((segment) => ({
    airline: AIRLINES[segment.carrier] ?? segment.carrier,
    arrival: toIsoDateTime(segment.arrTime),
    departure: toIsoDateTime(segment.depTime),
    destination: toAirport(segment.arrAirport),
    flightNumber: segment.flightNumber,
    origin: toAirport(segment.depAirport),
  })),
  totalPrice: String(order.totalPrice ?? ""),
});

export const upsertBooking = async (order: AtlasOrder, userId: string) => {
  const fields = {
    currency: order.currency,
    payload: toPayload(order),
    pnr: order.pnrCode,
    status: toBookingStatus(order),
    totalAmount: order.totalPrice === null ? null : String(order.totalPrice),
  };
  await db
    .insert(booking)
    .values({
      ...fields,
      createdAt: order.createdTime ? new Date(order.createdTime) : new Date(),
      orderNo: order.orderNo,
      userId,
    })
    .onConflictDoUpdate({
      set: { ...fields, updatedAt: new Date() },
      target: booking.orderNo,
    });
};

/** Books one route end-to-end: search -> verify -> create -> [pay] -> queryOrder. */
export const bookRoute = async (
  atlas: AtlasClient,
  route: { daysAhead: number; from: string; to: string },
  { pay = true }: { pay?: boolean } = {}
): Promise<AtlasOrder | null> => {
  const fromDate = dayOffset(route.daysAhead);
  try {
    const search = await atlas.flights.search.search({
      adultNum: 1,
      childNum: 0,
      displayCurrency: "USD",
      fromCity: route.from,
      fromDate,
      infantNum: 0,
      toCity: route.to,
      tripType: "OW",
    });
    const [routing] = search.routings as Record<string, unknown>[];
    if (!routing?.routingIdentifier) {
      console.warn(`No routings for ${route.from}->${route.to} on ${fromDate}`);
      return null;
    }

    const verify = await atlas.flights.verify.verify({
      routingIdentifier: String(routing.routingIdentifier),
    });
    if (!verify.sessionId) {
      console.warn(
        `Verify returned no sessionId for ${route.from}->${route.to}`
      );
      return null;
    }

    const created = await atlas.flights.order.create({
      contact: CONTACT,
      passengers: [PASSENGER],
      routingIdentifier: String(routing.routingIdentifier),
      sessionId: verify.sessionId,
    });
    const { orderNo } = created as { orderNo?: string | null };
    if (!orderNo) {
      console.warn(
        `Order creation failed for ${route.from}->${route.to}: ${JSON.stringify(created).slice(0, 200)}`
      );
      return null;
    }

    if (pay) {
      const payResult = await atlas.flights.paymentAndTicketing.pay({
        orderNo,
      });
      const { status: payStatus } = payResult as { status?: number };
      console.log(
        `Booked ${route.from}->${route.to} on ${fromDate}: ${orderNo} (pay status ${payStatus})`
      );
    } else {
      console.log(
        `Created unpaid order ${route.from}->${route.to} on ${fromDate}: ${orderNo}`
      );
    }

    const live = await atlas.flights.queryOrder.query({ orderNo });
    return live as unknown as AtlasOrder;
  } catch (error) {
    console.error(
      `Route ${route.from}->${route.to} on ${fromDate} failed`,
      error
    );
    return null;
  }
};

const isOrder = (order: AtlasOrder | null): order is AtlasOrder =>
  order !== null;

const main = async () => {
  const [targetUser] = await db.select({ id: user.id }).from(user).limit(1);
  if (!targetUser) {
    console.error(
      "No users found. Sign in to the app once so a user row exists, then rerun."
    );
    process.exit(1);
  }

  const atlas = await getAtlasClient();

  // Replace the fictional demo rows so only real sandbox orders remain.
  await db.delete(booking).where(like(booking.orderNo, "AT-%"));

  const booked = await Promise.all(
    SEED_ROUTES.map((route) => bookRoute(atlas, route))
  );

  // Fold in order numbers passed as CLI args (e.g. bookings made earlier by hand).
  const manualOrderNos = process.argv.slice(2);
  const manual = await Promise.all(
    manualOrderNos.map(async (orderNo) => {
      try {
        const live = await atlas.flights.queryOrder.query({ orderNo });
        return live as unknown as AtlasOrder;
      } catch (error) {
        console.error(`Querying manual order ${orderNo} failed`, error);
        return null;
      }
    })
  );

  const orders = [...booked, ...manual].filter(isOrder);
  if (orders.length === 0) {
    console.error("No orders were booked or queried. Nothing to seed.");
    process.exit(1);
  }

  await Promise.all(orders.map((order) => upsertBooking(order, targetUser.id)));

  const incidentReports = await Promise.all(
    orders.map(async (order) => {
      const incidents = await atlas.webhook.incidents({
        orderNo: order.orderNo,
        pageSize: 10,
      });
      return `${order.orderNo}: ${incidents.records.length} incidents`;
    })
  );
  console.log(incidentReports.join("\n"));

  console.log(
    `Seeded ${orders.length} real Atlas bookings for user ${targetUser.id}`
  );
};

// Only run when executed directly; other scripts import bookRoute/upsertBooking.
const isDirectRun =
  process.argv[1]?.endsWith("seed-atlas-bookings.ts") ?? false;

if (isDirectRun) {
  await main();
}
