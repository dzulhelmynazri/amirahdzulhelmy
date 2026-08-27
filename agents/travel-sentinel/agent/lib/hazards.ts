import { placeOf } from "./gazetteer";
import type { Place } from "./gazetteer";

/**
 * Recorded earthquakes near a destination, from USGS.
 *
 * This is the agent's one real instrument. Everything else it can say about a
 * destination comes from a model reading the web, which produces text that
 * sounds exactly like knowledge whether or not anything happened. An
 * instrument either measured something or it did not, and can say which.
 *
 * USGS publishes the FDSN event service with no key and no quota. The radius
 * filter runs server-side, so the response stays small and every distance
 * reported here is computed from coordinates USGS published rather than from a
 * guess about where a city is.
 */

/** Below this it is not news even next door. */
export const MIN_MAGNITUDE = 4.5;
/** Roughly where a quake is felt rather than merely recorded. */
export const DEFAULT_RADIUS_KM = 300;
/** Instrumental sources are recent-only; older is history. */
export const LOOKBACK_DAYS = 14;
/** The bar for posting unprompted, higher than for answering a question. */
export const WORTH_REPORTING = 5;

const USGS_ENDPOINT = "https://earthquake.usgs.gov/fdsnws/event/1/query";
const EARTH_RADIUS_KM = 6371;
const HOURS_PER_DAY = 24;
const MS_PER_HOUR = 3_600_000;
const DEGREES_IN_HALF_TURN = 180;

export interface HazardEvent {
  /** Kilometres from the destination, computed from published coordinates. */
  distanceKm: number;
  magnitude: number;
  /** USGS's own description of where it happened. */
  place: string;
  time: string;
  /** The USGS event page, so a traveller can go and read the source. */
  url: string;
}

/**
 * Three outcomes, never collapsed into two.
 *
 * `unreachable` exists because silence is indistinguishable from "nothing
 * happened", and that is the one wrong answer this must never give. An empty
 * `events` array means the instrument looked and found nothing, which is a
 * different sentence entirely.
 */
export type HazardResult =
  | { events: HazardEvent[]; kind: "measured"; place: Place }
  | { kind: "unknown-place"; code: string }
  | { kind: "unreachable"; reason: string };

const toRadians = (degrees: number) =>
  (degrees * Math.PI) / DEGREES_IN_HALF_TURN;

/** Haversine. Good to a few metres at these distances, which is ample. */
export const greatCircleKm = (
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
): number => {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const half =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) *
      Math.cos(toRadians(b.lat)) *
      Math.sin(dLon / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(half));
};

interface UsgsFeature {
  geometry?: { coordinates?: number[] };
  id?: string;
  properties?: {
    mag?: number | null;
    place?: string | null;
    time?: number | null;
    url?: string | null;
  };
}

const toEvent = (feature: UsgsFeature, origin: Place): HazardEvent | null => {
  const { mag, place, time, url } = feature.properties ?? {};
  const [lon, lat] = feature.geometry?.coordinates ?? [];

  if (
    typeof mag !== "number" ||
    typeof lat !== "number" ||
    typeof lon !== "number"
  ) {
    return null;
  }

  return {
    distanceKm: Math.round(greatCircleKm(origin, { lat, lon })),
    magnitude: mag,
    place: place ?? "location not given",
    time: new Date(time ?? 0).toISOString(),
    url:
      url ??
      `https://earthquake.usgs.gov/earthquakes/eventpage/${feature.id ?? ""}`,
  };
};

export const checkHazards = async (input: {
  code: string;
  minMagnitude?: number;
  radiusKm?: number;
}): Promise<HazardResult> => {
  const place = placeOf(input.code);

  // Short-circuits before any request. Asking USGS about coordinates we do not
  // have would mean inventing them first.
  if (!place) {
    return { code: input.code.trim().toUpperCase(), kind: "unknown-place" };
  }

  const since = new Date(
    Date.now() - LOOKBACK_DAYS * HOURS_PER_DAY * MS_PER_HOUR
  );
  const query = new URLSearchParams({
    format: "geojson",
    latitude: String(place.lat),
    longitude: String(place.lon),
    maxradiuskm: String(input.radiusKm ?? DEFAULT_RADIUS_KM),
    minmagnitude: String(input.minMagnitude ?? MIN_MAGNITUDE),
    orderby: "time",
    starttime: since.toISOString(),
  });

  try {
    const response = await fetch(`${USGS_ENDPOINT}?${query}`);

    if (!response.ok) {
      return {
        kind: "unreachable",
        reason: `USGS answered ${response.status}`,
      };
    }

    const body = (await response.json()) as { features?: UsgsFeature[] };
    const events: HazardEvent[] = [];

    for (const feature of body.features ?? []) {
      const event = toEvent(feature, place);

      if (event) {
        events.push(event);
      }
    }

    return { events, kind: "measured", place };
  } catch (error) {
    return {
      kind: "unreachable",
      reason: error instanceof Error ? error.message : "USGS did not respond",
    };
  }
};
