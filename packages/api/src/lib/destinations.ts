import { db } from "@atlas/db";
import { booking } from "@atlas/db/schema/booking";
import { eq } from "drizzle-orm";

/**
 * Where one traveller is flying, from their own bookings.
 *
 * travel-sentinel has a version of this for the schedule, which watches every
 * destination anyone is flying to — it has no viewer. This one is scoped to a
 * user, because it decides what appears on their board.
 *
 * Kept separate rather than shared: the agent's copy must stay unscoped to do
 * its job, and one function that is sometimes scoped and sometimes not is how
 * an account ends up seeing another account's trips.
 */

const MS_PER_DAY = 86_400_000;

/** Matches travel-sentinel's `WATCH_HORIZON_DAYS`. */
export const WATCH_HORIZON_DAYS = 180;

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
 * IATA codes this user reaches within the horizon.
 *
 * An empty set means they have no upcoming trips, which is different from
 * "everything matches". The caller shows an empty board and says why.
 */
export const upcomingDestinationCodes = async (
  userId: string,
  horizonDays = WATCH_HORIZON_DAYS
): Promise<Set<string>> => {
  const rows = await db
    .select({ payload: booking.payload })
    .from(booking)
    .where(eq(booking.userId, userId));

  const now = Date.now();
  const horizon = now + horizonDays * MS_PER_DAY;
  const codes = new Set<string>();

  for (const row of rows) {
    for (const segment of segmentsOf(row.payload)) {
      const departsAt = toDate(segment.depTime);
      const code = String(segment.arrAirport ?? "")
        .trim()
        .toUpperCase();

      if (!(departsAt && code)) {
        continue;
      }

      const at = departsAt.getTime();

      if (at >= now && at <= horizon) {
        codes.add(code);
      }
    }
  }

  return codes;
};
