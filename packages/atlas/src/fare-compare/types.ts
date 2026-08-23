/**
 * Types for the pre-sales batch fare comparison tool.
 *
 * Scope guard: `/priceCompareSearch.do` returns raw prices with maximum route
 * coverage. It skips booking-rule filtering and ignores supplier operational
 * switches, so results are for pre-sales route lookup, batch price comparison
 * and capability benchmarking ONLY. They are not official customer quotes and
 * must not be the sole pricing source in a production booking flow — use the
 * regular search + verify endpoints for that.
 */

export interface PassengerCount {
  adults: number;
  children: number;
  infants: number;
}

/** One resolved query — exactly one call to `/priceCompareSearch.do`. */
export interface FareQuery {
  airlines: string[];
  departureDate: string;
  destination: string;
  /** Stable identifier used to correlate outcomes, fares and log entries. */
  id: string;
  origin: string;
  passengers: PassengerCount;
  returnDate?: string;
  /** Settlement currency (ISO 4217). Omit to use the airline quotation currency. */
  currency?: string;
}

/** Cartesian specification expanded into `FareQuery[]` by `expandQueries`. */
export interface FareQuerySpec {
  /** Each entry is one `airlines` filter; `[]` means "all airlines". */
  airlineFilters?: string[][];
  currencies?: (string | undefined)[];
  departureDates: string[];
  destinations: string[];
  origins: string[];
  passengers?: PassengerCount[];
  /** `undefined` entries produce one-way queries. */
  returnDates?: (string | undefined)[];
  /** Drops queries whose origin equals its destination. Defaults to true. */
  skipSameCityPairs?: boolean;
}

/** One direction of a journey, with the times that make options distinguishable. */
export interface FareLeg {
  arrivalAirport: string;
  /** Local `HH:MM`. */
  arrivalTime: string;
  carrier: string;
  /** `YYYY-MM-DD` the leg departs. */
  date: string;
  /** Crosses midnight — 1 for `+1`. Zero when it lands the same day. */
  dayOffset: number;
  departureAirport: string;
  departureTime: string;
  durationMinutes?: number;
  flightNumbers: string[];
  stops: number;
}

export interface NormalizedBaggage {
  description: string;
  included: boolean;
  pieces?: number;
  weightKg?: number;
}

/** A single comparable fare option, flattened from one `routings[]` entry. */
export interface NormalizedFare {
  adultPrice: number;
  adultTax: number;
  /** `adultPrice + adultTax + transactionFeePerPax`, per the API reference. */
  adultTotal: number;
  airline: string;
  baggage: NormalizedBaggage;
  cabin?: string;
  /** Settlement currency. Never the display currency — see `displayCurrency`. */
  currency: string;
  departureDate: string;
  destination: string;
  /**
   * Display-only currency, if the response carried one. Never use it for
   * comparison, settlement or accounting.
   */
  displayCurrency?: string;
  durationMinutes?: number;
  expireTime?: string;
  flightNumbers: string[];
  /** Return leg. Absent on one-way fares. */
  inbound?: FareLeg;
  infantAllowed?: boolean;
  /** Outbound leg. Present whenever the routing had any segment. */
  outbound: FareLeg;
  operatingAirline?: string;
  origin: string;
  queryId: string;
  returnDate?: string;
  route: string;
  routingIdentifier?: string;
  seatCount?: number;
  /**
   * Derived, not an API field: true when the routing carries an identifier,
   * has seats left and has not expired. See `sellableReason`.
   */
  sellable: boolean;
  sellableReason: string;
  stops: number;
  transactionFeePerPax: number;
  tripType: "one-way" | "round-trip";
}

export type QueryStatus = "empty" | "error" | "ok";

export interface NoResultReason {
  code: string;
  message?: string;
  recentFlightDates?: string[];
}

export interface QueryError {
  /** Atlas business status code, when the failure came back as HTTP 200. */
  apiStatus?: number;
  kind:
    | "auth"
    | "http"
    | "malformed"
    | "network"
    | "quota"
    | "rate-limit"
    | "server"
    | "timeout"
    | "validation";
  message: string;
  retryable: boolean;
}

/** Per-query result, including failures — nothing is silently dropped. */
export interface QueryOutcome {
  attempts: number;
  /** Request id we generated and sent as `requestId`. */
  clientRequestId: string;
  durationMs: number;
  error?: QueryError;
  fareCount: number;
  noResultReason?: NoResultReason;
  query: FareQuery;
  queryId: string;
  /** Request id Atlas echoed back, for support tickets. */
  requestId?: string;
  status: QueryStatus;
}

export interface BatchStats {
  emptyQueries: number;
  failedQueries: number;
  okQueries: number;
  /** Requests actually sent, including retries — this is what bills quota. */
  requestsSent: number;
  totalFares: number;
  totalQueries: number;
  wallClockMs: number;
}

export interface BatchResult {
  aborted: boolean;
  abortReason?: string;
  fares: NormalizedFare[];
  outcomes: QueryOutcome[];
  stats: BatchStats;
}

export interface LogEntry {
  attempt: number;
  clientRequestId: string;
  durationMs?: number;
  event: "abort" | "attempt" | "failure" | "retry" | "success";
  message?: string;
  queryId: string;
  requestId?: string;
  route: string;
}

export interface BatchOptions {
  /** Max in-flight requests. Defaults to 4. */
  concurrency?: number;
  logger?: (entry: LogEntry) => void;
  /** Hard cap on requests sent, guarding the daily quota. */
  maxRequests?: number;
  maxRetries?: number;
  /** Minimum gap between request starts, for QPS control. Defaults to 200ms. */
  minIntervalMs?: number;
  onProgress?: (outcome: QueryOutcome) => void;
  retryBaseDelayMs?: number;
  /** Stop the whole batch on auth failure or quota exhaustion. Defaults true. */
  stopOnFatalError?: boolean;
  timeoutMs?: number;
  /** Injectable clock and sleep, so tests need no real timers. */
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}
