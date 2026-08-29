/**
 * Things about an itinerary that are wrong by arithmetic.
 *
 * The mistakes that ruin trips are not exotic. A 35-minute connection with
 * bags. A next flight that leaves before this one lands. An airport change
 * nobody costed the taxi for. Every one is visible in the timestamps, and
 * every one gets booked anyway, because the traveller is looking at price and
 * the agent is looking at what it was asked for.
 *
 * **These are checks, not opinions.** Each finding states the measurement and
 * the threshold it crossed; none says "do not book this". Whether a traveller
 * can run for a gate is theirs to decide — an agent that vetoes itineraries
 * on judgement will eventually veto one for a bad reason, invisibly.
 *
 * Adapted from the sibling Atlas runtime, with one honest narrowing: Atlas
 * stamps are **airport-local with no zone**. A connection gap at one airport
 * compares two clocks in the same zone, so that arithmetic holds. A single
 * leg's duration spans two zones, so "arrives before it departs" cannot be
 * told apart from an eastbound date-line crossing — that check is dropped
 * rather than kept wrong.
 *
 * Nothing here calls an API. If the timestamps are wrong the findings are
 * wrong, and that is the only failure mode worth having.
 */

export interface CoherenceFinding {
  /** What was measured, and against what. "35 min, against 60 min minimum." */
  detail: string;
  id: string;
  severity: "check" | "problem";
  what: string;
}

interface Segment {
  arrAirport?: unknown;
  arrTime?: unknown;
  depAirport?: unknown;
  depTime?: unknown;
  flightNumber?: unknown;
}

/** Below this, a connection is a sprint. Standard domestic minimum. */
const TIGHT_MINUTES = 60;
/** Below this it is not a connection, it is a missed flight with extra steps. */
const IMPOSSIBLE_MINUTES = 30;
/** Past this a layover stops being a connection and becomes a night out. */
const LONG_LAYOVER_HOURS = 8;

const STAMP_LENGTH = 12;

/** Atlas writes `YYYYMMDDHHMM`, airport-local. Anything else is unusable. */
const toMillis = (stamp: unknown): number | null => {
  const text = String(stamp ?? "");

  if (text.length < STAMP_LENGTH) {
    return null;
  }

  const parsed = Date.parse(
    `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}T${text.slice(8, 10)}:${text.slice(10, 12)}:00Z`
  );

  return Number.isNaN(parsed) ? null : parsed;
};

const MINUTE = 60 * 1000;

const text = (value: unknown): string => String(value ?? "").trim();

/**
 * One direction of a journey. Outbound and return are checked separately:
 * the gap between the last outbound leg and the first return leg is the
 * trip itself, and calling a holiday a long layover would teach the model
 * to ignore every finding here.
 */
const checkDirection = (segments: Segment[]): CoherenceFinding[] => {
  const findings: CoherenceFinding[] = [];

  for (const [index, leg] of segments.entries()) {
    const next = segments[index + 1];

    if (!next) {
      continue;
    }

    const flight = text(next.flightNumber) || `segment ${index + 2}`;
    const here = text(leg.arrAirport);

    // Connecting from a different airport is not a connection at all — it is
    // a transfer the traveller makes themselves, and nobody costed the taxi.
    if (here && text(next.depAirport) && here !== text(next.depAirport)) {
      findings.push({
        detail: `Arrives ${here}, departs ${text(next.depAirport)}. The traveller gets between them on their own.`,
        id: `airport-change-${flight}`,
        severity: "problem",
        what: "The connection changes airport",
      });
      // Cross-airport gap mixes two clocks; the minutes below would be noise.
      continue;
    }

    const arrive = toMillis(leg.arrTime);
    const depart = toMillis(next.depTime);

    if (arrive === null || depart === null) {
      continue;
    }

    const connection = (depart - arrive) / MINUTE;

    if (connection < 0) {
      findings.push({
        detail: `${flight} leaves ${Math.abs(Math.round(connection))} minutes before the inbound lands at ${here}.`,
        id: `overlap-${flight}`,
        severity: "problem",
        what: "The next flight departs before this one arrives",
      });
    } else if (connection < IMPOSSIBLE_MINUTES) {
      findings.push({
        detail: `${Math.round(connection)} minutes on the ground at ${here}. Bags do not usually make this.`,
        id: `impossible-${flight}`,
        severity: "problem",
        what: `The connection at ${here} is very short`,
      });
    } else if (connection < TIGHT_MINUTES) {
      findings.push({
        detail: `${Math.round(connection)} minutes at ${here}, against a ${TIGHT_MINUTES}-minute minimum. International or a terminal change needs more still.`,
        id: `tight-${flight}`,
        severity: "check",
        what: `The connection at ${here} is tight`,
      });
    } else if (connection > LONG_LAYOVER_HOURS * 60) {
      findings.push({
        detail: `${Math.round((connection / 60) * 10) / 10} hours at ${here}. Worth knowing if nobody meant to book it.`,
        id: `layover-${flight}`,
        severity: "check",
        what: "That is a long layover",
      });
    }
  }

  return findings;
};

/**
 * Reads a verified routing and reports what does not add up.
 *
 * Defensive on shape: the API reference types `routing` loosely, and a shape
 * change upstream should degrade to no findings, never to a crash inside the
 * verify step of a live booking.
 */
export const checkRouting = (routing: unknown): CoherenceFinding[] => {
  if (typeof routing !== "object" || routing === null) {
    return [];
  }

  const { fromSegments, retSegments } = routing as {
    fromSegments?: unknown;
    retSegments?: unknown;
  };

  return [
    ...(Array.isArray(fromSegments)
      ? checkDirection(fromSegments as Segment[])
      : []),
    ...(Array.isArray(retSegments)
      ? checkDirection(retSegments as Segment[])
      : []),
  ];
};
