import type { FareQuery, FareQuerySpec, PassengerCount } from "./types";

const DEFAULT_PASSENGERS: PassengerCount = {
  adults: 1,
  children: 0,
  infants: 0,
};

const DATE_SEPARATOR = /-/gu;

/** Atlas expects `YYYYMMDD`; accept `YYYY-MM-DD` for convenience. */
export const toAtlasDate = (value: string): string =>
  value.replace(DATE_SEPARATOR, "");

/** Renders `YYYYMMDD` back to `YYYY-MM-DD` for reports. */
export const toIsoDate = (value: string): string => {
  const compact = toAtlasDate(value);

  if (compact.length !== 8) {
    return value;
  }

  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
};

export const routeKey = (origin: string, destination: string): string =>
  `${origin}-${destination}`;

export class FareQueryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FareQueryValidationError";
  }
}

const IATA_PATTERN = /^[A-Z]{3}$/u;
const COMPACT_DATE_PATTERN = /^\d{8}$/u;
const CURRENCY_PATTERN = /^[A-Z]{3}$/u;

/**
 * Validates a single query against the documented constraints so a malformed
 * batch fails locally instead of burning daily quota on status 100/101/102.
 */
export const validateQuery = (query: FareQuery): void => {
  const { adults, children, infants } = query.passengers;

  if (!IATA_PATTERN.test(query.origin)) {
    throw new FareQueryValidationError(
      `origin must be a 3-letter IATA code, got "${query.origin}"`
    );
  }

  if (!IATA_PATTERN.test(query.destination)) {
    throw new FareQueryValidationError(
      `destination must be a 3-letter IATA code, got "${query.destination}"`
    );
  }

  if (!COMPACT_DATE_PATTERN.test(query.departureDate)) {
    throw new FareQueryValidationError(
      `departureDate must be YYYYMMDD, got "${query.departureDate}"`
    );
  }

  if (
    query.returnDate !== undefined &&
    !COMPACT_DATE_PATTERN.test(query.returnDate)
  ) {
    throw new FareQueryValidationError(
      `returnDate must be YYYYMMDD, got "${query.returnDate}"`
    );
  }

  if (query.currency !== undefined && !CURRENCY_PATTERN.test(query.currency)) {
    throw new FareQueryValidationError(
      `currency must be a 3-letter ISO 4217 code, got "${query.currency}"`
    );
  }

  if (adults < 1 || adults > 9) {
    throw new FareQueryValidationError(`adults must be 1-9, got ${adults}`);
  }

  if (children < 0 || children > 8) {
    throw new FareQueryValidationError(`children must be 0-8, got ${children}`);
  }

  if (infants < 0 || infants > adults) {
    throw new FareQueryValidationError(
      `infants must be 0-${adults} (cannot exceed adults), got ${infants}`
    );
  }
};

const passengerSuffix = ({ adults, children, infants }: PassengerCount) =>
  `${adults}a${children}c${infants}i`;

/**
 * Expands a cartesian spec into concrete queries. Each combination of origin,
 * destination, departure date, return date, currency, airline filter and
 * passenger count becomes one request.
 */
interface QueryCombination {
  airlines: string[];
  currency: string | undefined;
  departureDate: string;
  destination: string;
  origin: string;
  passengers: PassengerCount;
  returnDate: string | undefined;
}

const buildQuery = (combination: QueryCombination): FareQuery => {
  const from = toAtlasDate(combination.departureDate);
  const back =
    combination.returnDate === undefined
      ? undefined
      : toAtlasDate(combination.returnDate);
  const airlineTag =
    combination.airlines.length === 0 ? "all" : combination.airlines.join("+");

  return {
    airlines: combination.airlines,
    departureDate: from,
    destination: combination.destination,
    id: [
      routeKey(combination.origin, combination.destination),
      from,
      back ?? "ow",
      combination.currency ?? "auto",
      airlineTag,
      passengerSuffix(combination.passengers),
    ].join("|"),
    origin: combination.origin,
    passengers: combination.passengers,
    ...(back === undefined ? {} : { returnDate: back }),
    ...(combination.currency === undefined
      ? {}
      : { currency: combination.currency }),
  };
};

/** Cartesian product of every axis, before validation. */
const combinations = (spec: FareQuerySpec): QueryCombination[] => {
  const airlineFilters = spec.airlineFilters ?? [[]];
  const currencies = spec.currencies ?? [undefined];
  const passengers = spec.passengers ?? [DEFAULT_PASSENGERS];
  const returnDates = spec.returnDates ?? [undefined];
  const skipSamePairs = spec.skipSameCityPairs ?? true;

  const result: QueryCombination[] = [];

  for (const origin of spec.origins) {
    for (const destination of spec.destinations) {
      if (skipSamePairs && origin === destination) {
        continue;
      }

      for (const departureDate of spec.departureDates) {
        for (const returnDate of returnDates) {
          for (const currency of currencies) {
            for (const airlines of airlineFilters) {
              for (const pax of passengers) {
                result.push({
                  airlines,
                  currency,
                  departureDate,
                  destination,
                  origin,
                  passengers: pax,
                  returnDate,
                });
              }
            }
          }
        }
      }
    }
  }

  return result;
};

export const expandQueries = (spec: FareQuerySpec): FareQuery[] => {
  const queries = combinations(spec).map(buildQuery);

  for (const query of queries) {
    validateQuery(query);
  }

  return queries;
};

/**
 * Builds the `/priceCompareSearch.do` request body.
 *
 * `clientRequestId` is omitted by default. The reference calls `requestId` an
 * optional client-generated tracing id, but the live sandbox rejects a
 * self-generated value with "requestId invalid or expired. Run a new search.do
 * (Smart Search) to get a fresh one." Pass `sendRequestId` only when you have a
 * requestId that actually came from a prior search call.
 */
export const toRequestBody = (
  query: FareQuery,
  clientRequestId: string,
  sendRequestId = false
): Record<string, unknown> => ({
  adultNum: query.passengers.adults,
  childNum: query.passengers.children,
  fromCity: query.origin,
  fromDate: query.departureDate,
  infantNum: query.passengers.infants,
  toCity: query.destination,
  tripType: query.returnDate === undefined ? "1" : "2",
  ...(query.returnDate === undefined ? {} : { retDate: query.returnDate }),
  ...(query.currency === undefined ? {} : { currency: query.currency }),
  ...(query.airlines.length === 0 ? {} : { airlines: query.airlines }),
  ...(sendRequestId ? { requestId: clientRequestId } : {}),
});
