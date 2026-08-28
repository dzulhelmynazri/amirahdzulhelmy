import { placeOf } from "./gazetteer";

/**
 * Where this account is actually flying, from our own booking table.
 *
 * The schedules used to get this from `order-list`, which asks Atlas. Atlas
 * returns nothing for our sandbox account, so the agent had no destinations at
 * all — and rather than stopping, it chose its own. That is how alerts for
 * Seoul, Bali and Bangkok appeared on a board belonging to someone whose only
 * trips were Kuala Lumpur to Singapore.
 *
 * Nothing here is a judgement. A destination is on the list because a booking
 * says so, or it is not on the list.
 */

const MS_PER_DAY = 86_400_000;

/**
 * How far ahead a trip still counts as upcoming.
 *
 * Six months rather than a few weeks, because the decisions an alert changes
 * are not all last-minute: a visa rule, a political advisory or a seasonal
 * hazard is worth knowing about while there is still time to act on it. The
 * board and `report-alert` share this number so a destination cannot be
 * worth reporting and then invisible to the person it was reported for.
 */
export const WATCH_HORIZON_DAYS = 180;

export interface UpcomingDestination {
  /** IATA code, resolvable through the gazetteer. */
  code: string;
  /** Earliest departure among the bookings that reach it. */
  departsAt: string;
  name: string;
  orderNos: string[];
}

interface Segment {
  arrAirport?: unknown;
  depTime?: unknown;
}

/** Atlas writes `YYYYMMDDHHMM`; anything else is unusable and skipped. */
const toDate = (stamp: unknown): Date | null => {
  const text = String(stamp ?? "");

  if (text.length < 12) {
    return null;
  }

  const parsed = new Date(
    `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}T${text.slice(8, 10)}:${text.slice(10, 12)}:00Z`
  );

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const segmentsOf = (payload: unknown): Segment[] => {
  const routing = (payload as { routing?: Record<string, unknown> } | null)
    ?.routing;

  if (!routing) {
    return [];
  }

  return [routing.fromSegments, routing.retSegments]
    .filter(Array.isArray)
    .flat() as Segment[];
};

/**
 * Destinations departing within `horizonDays`, deduplicated.
 *
 * Codes the gazetteer does not hold are dropped rather than guessed at: a
 * destination we cannot place is one we cannot check, and saying nothing about
 * it is honest where inventing coordinates for it is not.
 */
export const upcomingDestinations = async (
  horizonDays = WATCH_HORIZON_DAYS
): Promise<UpcomingDestination[]> => {
  const { db } = await import("@atlas/db");
  const { booking } = await import("@atlas/db/schema/booking");

  const rows = await db
    .select({ orderNo: booking.orderNo, payload: booking.payload })
    .from(booking);

  const now = Date.now();
  const horizon = now + horizonDays * MS_PER_DAY;
  const byCode = new Map<string, UpcomingDestination>();

  for (const row of rows) {
    for (const segment of segmentsOf(row.payload)) {
      const departsAt = toDate(segment.depTime);
      const code = String(segment.arrAirport ?? "")
        .trim()
        .toUpperCase();
      const place = placeOf(code);

      if (!(departsAt && place)) {
        continue;
      }

      const at = departsAt.getTime();

      if (at < now || at > horizon) {
        continue;
      }

      const existing = byCode.get(code);

      if (existing) {
        existing.orderNos.push(row.orderNo);
        // Keep the soonest departure: it decides how urgent the place is.
        if (departsAt.toISOString() < existing.departsAt) {
          existing.departsAt = departsAt.toISOString();
        }
        continue;
      }

      byCode.set(code, {
        code,
        departsAt: departsAt.toISOString(),
        name: place.name,
        orderNos: [row.orderNo],
      });
    }
  }

  // Soonest first: the trip departing next is the one worth checking hardest.
  return [...byCode.values()].toSorted((a, b) =>
    a.departsAt.localeCompare(b.departsAt)
  );
};
