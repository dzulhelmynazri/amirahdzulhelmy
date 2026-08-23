import { routeKey, toIsoDate } from "./expand";
import type {
  FareLeg,
  FareQuery,
  NoResultReason,
  NormalizedBaggage,
  NormalizedFare,
} from "./types";

/**
 * The API reference types `routings` as an open array, so every field is read
 * defensively. A shape change upstream degrades a row rather than throwing.
 */

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const asArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

const asString = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
};

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
};

const numberOrZero = (value: unknown): number => asNumber(value) ?? 0;

const isTruthyFlag = (value: unknown): boolean =>
  value === true || value === 1 || value === "1" || value === "true";

const readBaggage = (rules: Record<string, unknown> | undefined) => {
  const included = isTruthyFlag(rules?.hasBaggage);
  const elements = asArray(rules?.baggageElements)
    .map(asRecord)
    .filter((element): element is Record<string, unknown> => Boolean(element));

  const first = elements.find(
    (element) => asString(element.passengerType) !== "INF"
  );

  const pieces = asNumber(first?.piece);
  const weightKg = asNumber(first?.weight);

  const parts: string[] = [];
  if (pieces !== undefined && pieces > 0) {
    parts.push(`${pieces} pc`);
  }
  if (weightKg !== undefined && weightKg > 0) {
    parts.push(`${weightKg} kg`);
  }

  const baggage: NormalizedBaggage = {
    description: included ? parts.join(" / ") || "included" : "not included",
    included,
    ...(pieces === undefined ? {} : { pieces }),
    ...(weightKg === undefined ? {} : { weightKg }),
  };

  return baggage;
};

const readSegments = (value: unknown) =>
  asArray(value)
    .map(asRecord)
    .filter((segment): segment is Record<string, unknown> => Boolean(segment));

const minSeatCount = (segments: Record<string, unknown>[]) => {
  const counts = segments
    .map((segment) => asNumber(segment.seatCount))
    .filter((count): count is number => count !== undefined);

  return counts.length === 0 ? undefined : Math.min(...counts);
};

const sumDuration = (segments: Record<string, unknown>[]) => {
  const durations = segments
    .map((segment) => asNumber(segment.duration))
    .filter((duration): duration is number => duration !== undefined);

  return durations.length === 0
    ? undefined
    : durations.reduce((total, duration) => total + duration, 0);
};

const countStops = (segments: Record<string, unknown>[]) => {
  const layovers = Math.max(segments.length - 1, 0);
  const enRoute = segments.reduce(
    (total, segment) => total + asArray(segment.stopCities).length,
    0
  );

  return layovers + enRoute;
};

/**
 * Derives sellability. The endpoint has no explicit sellable flag, so this is
 * a heuristic: a routing is treated as sellable when it carries an identifier
 * for downstream calls, still has seats, and has not expired.
 */
const deriveSellable = (
  routingIdentifier: string | undefined,
  seatCount: number | undefined,
  expireTime: string | undefined,
  nowMs: number
): { sellable: boolean; sellableReason: string } => {
  if (!routingIdentifier) {
    return { sellable: false, sellableReason: "no routingIdentifier" };
  }

  if (seatCount !== undefined && seatCount <= 0) {
    return { sellable: false, sellableReason: "no seats remaining" };
  }

  if (expireTime !== undefined) {
    const expiresAt = Date.parse(expireTime);
    if (Number.isFinite(expiresAt) && expiresAt <= nowMs) {
      return { sellable: false, sellableReason: `expired at ${expireTime}` };
    }
  }

  return { sellable: true, sellableReason: "identifier present, seats open" };
};

/**
 * Atlas exposes three cabin-ish fields and only one is human-readable:
 *   `cabin`       booking class letter ("Q", "W", "") — meaningless to a traveller
 *   `cabinClass`  a NUMBER (1 = economy) — stringifies to "1"
 *   `fareFamily`  "Super Saver", "Fly", "Cheapest" — the airline's own wording
 * Prefer the fare family, fall back to the mapped class, never show the letter.
 */
const CABIN_CLASS_LABELS: Record<number, string> = {
  1: "Economy",
  2: "Premium economy",
  3: "Business",
  4: "First",
};

const readCabin = (segment: Record<string, unknown>): string | undefined => {
  const fareFamily = asString(segment.fareFamily);

  if (fareFamily !== undefined) {
    return fareFamily;
  }

  const cabinClass = asNumber(segment.cabinClass);

  return cabinClass === undefined ? undefined : CABIN_CLASS_LABELS[cabinClass];
};

/** Atlas stamps times as `YYYYMMDDHHMM` in local airport time. */
const ATLAS_STAMP_LENGTH = 12;
const MS_PER_DAY_LOCAL = 86_400_000;

const parseStamp = (value: unknown) => {
  const raw = asString(value);

  if (raw === undefined || raw.length < ATLAS_STAMP_LENGTH) {
    return;
  }

  return {
    date: `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`,
    time: `${raw.slice(8, 10)}:${raw.slice(10, 12)}`,
  };
};

const dayGap = (from: string | undefined, to: string | undefined) => {
  if (from === undefined || to === undefined) {
    return 0;
  }

  const gap = Date.parse(to) - Date.parse(from);

  return Number.isFinite(gap) ? Math.round(gap / MS_PER_DAY_LOCAL) : 0;
};

/**
 * Builds one direction of the journey. Times are what make two otherwise
 * identical rows tell-apart-able, so they are kept rather than flattened away.
 */
const readLeg = (segments: Record<string, unknown>[]): FareLeg | undefined => {
  const [first] = segments;
  const last = segments.at(-1);

  if (!(first && last)) {
    return;
  }

  const departure = parseStamp(first.depTime);
  const arrival = parseStamp(last.arrTime);
  const durationMinutes = sumDuration(segments);

  return {
    arrivalAirport: asString(last.arrAirport) ?? "",
    arrivalTime: arrival?.time ?? "",
    carrier: asString(first.carrier) ?? "??",
    date: departure?.date ?? "",
    dayOffset: dayGap(departure?.date, arrival?.date),
    departureAirport: asString(first.depAirport) ?? "",
    departureTime: departure?.time ?? "",
    flightNumbers: segments
      .map((segment) => asString(segment.flightNumber))
      .filter((flightNumber): flightNumber is string => Boolean(flightNumber)),
    stops: countStops(segments),
    ...(durationMinutes === undefined ? {} : { durationMinutes }),
  };
};

/** Money fields, pulled out so `normalizeRouting` stays readable. */
const readPricing = (routing: Record<string, unknown>, query: FareQuery) => ({
  adultPrice: numberOrZero(routing.adultPrice),
  adultTax: numberOrZero(routing.adultTax),
  currency: asString(routing.currency) ?? query.currency ?? "UNKNOWN",
  transactionFeePerPax: numberOrZero(routing.transactionFeePerPax),
});

const normalizeRouting = (
  routing: Record<string, unknown>,
  query: FareQuery,
  nowMs: number
): NormalizedFare | undefined => {
  const fromSegments = readSegments(routing.fromSegments);
  const retSegments = readSegments(routing.retSegments);
  const allSegments = [...fromSegments, ...retSegments];

  if (allSegments.length === 0) {
    return;
  }

  const firstSegment = fromSegments[0] ?? allSegments[0];

  if (!firstSegment) {
    return;
  }

  const { adultPrice, adultTax, currency, transactionFeePerPax } = readPricing(
    routing,
    query
  );
  const routingIdentifier = asString(routing.routingIdentifier);
  const seatCount = minSeatCount(allSegments);
  const expireTime = asString(routing.expireTime);
  const durationMinutes = sumDuration(allSegments);
  const cabin = readCabin(firstSegment);
  const operatingAirline = asString(firstSegment.operatingCarrier);
  const displayCurrency = asString(routing.displayCurrency);
  const { infantAllowed } = routing;

  const outbound = readLeg(
    fromSegments.length > 0 ? fromSegments : allSegments
  );

  if (!outbound) {
    return;
  }

  const inbound = retSegments.length > 0 ? readLeg(retSegments) : undefined;

  const { sellable, sellableReason } = deriveSellable(
    routingIdentifier,
    seatCount,
    expireTime,
    nowMs
  );

  return {
    adultPrice,
    adultTax,
    adultTotal: adultPrice + adultTax + transactionFeePerPax,
    airline: asString(firstSegment.carrier) ?? "??",
    // `/priceCompareSearch.do` returns `rules`; `/search.do` returns `rule`.
    baggage: readBaggage(asRecord(routing.rules) ?? asRecord(routing.rule)),
    currency,
    departureDate: toIsoDate(query.departureDate),
    destination: query.destination,
    flightNumbers: allSegments
      .map((segment) => asString(segment.flightNumber))
      .filter((flightNumber): flightNumber is string => Boolean(flightNumber)),
    origin: query.origin,
    outbound,
    queryId: query.id,
    route: routeKey(query.origin, query.destination),
    sellable,
    sellableReason,
    stops: countStops(fromSegments),
    transactionFeePerPax,
    tripType: query.returnDate === undefined ? "one-way" : "round-trip",
    ...(cabin === undefined ? {} : { cabin }),
    ...(displayCurrency === undefined ? {} : { displayCurrency }),
    ...(durationMinutes === undefined ? {} : { durationMinutes }),
    ...(expireTime === undefined ? {} : { expireTime }),
    ...(inbound === undefined ? {} : { inbound }),
    ...(operatingAirline === undefined ? {} : { operatingAirline }),
    ...(routingIdentifier === undefined ? {} : { routingIdentifier }),
    ...(seatCount === undefined ? {} : { seatCount }),
    ...(query.returnDate === undefined
      ? {}
      : { returnDate: toIsoDate(query.returnDate) }),
    ...(typeof infantAllowed === "boolean" ? { infantAllowed } : {}),
  };
};

export const normalizeRoutings = (
  routings: unknown,
  query: FareQuery,
  nowMs: number = Date.now()
): NormalizedFare[] =>
  asArray(routings)
    .map(asRecord)
    .filter((routing): routing is Record<string, unknown> => Boolean(routing))
    .map((routing) => normalizeRouting(routing, query, nowMs))
    .filter((fare): fare is NormalizedFare => fare !== undefined);

export const readNoResultReason = (
  value: unknown
): NoResultReason | undefined => {
  const record = asRecord(value);
  const code = asString(record?.code);

  if (!code) {
    return;
  }

  const message = asString(record?.message);
  const dates = asArray(record?.recentFlightDates)
    .map(asString)
    .filter((date): date is string => Boolean(date));

  return {
    code,
    ...(message === undefined ? {} : { message }),
    ...(dates.length === 0 ? {} : { recentFlightDates: dates }),
  };
};

export const readRequestId = (value: unknown): string | undefined =>
  asString(asRecord(value)?.requestId);
