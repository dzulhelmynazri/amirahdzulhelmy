import { setTimeout as delay } from "node:timers/promises";

import {
  EMPTY_RESULT_STATUSES,
  errorFromApiStatus,
  errorFromException,
  isFatalError,
} from "./errors";
import { toRequestBody, validateQuery } from "./expand";
import {
  normalizeRoutings,
  readNoResultReason,
  readRequestId,
} from "./normalize";
import type {
  BatchOptions,
  BatchResult,
  FareQuery,
  LogEntry,
  NoResultReason,
  NormalizedFare,
  QueryError,
  QueryOutcome,
} from "./types";

/** Minimal transport contract, so tests can inject a fake without a network. */
export interface FareCompareTransport {
  post: (
    path: string,
    body: unknown,
    options: { timeoutMs: number }
  ) => Promise<unknown>;
}

const DEFAULTS = {
  concurrency: 4,
  maxRetries: 2,
  minIntervalMs: 200,
  retryBaseDelayMs: 500,
  timeoutMs: 30_000,
} as const;

const ENDPOINT = "/priceCompareSearch.do";

const noopLogger = (_entry: LogEntry): void => undefined;
const JITTER_RATIO = 0.25;

const defaultSleep = (ms: number): Promise<void> => delay(ms);

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

/**
 * Serialises request starts so they are at least `minIntervalMs` apart. Paired
 * with a concurrency cap this keeps the batch under the documented QPS limit.
 */
class RateGate {
  private nextAllowedAt = 0;
  private readonly minIntervalMs: number;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(
    minIntervalMs: number,
    now: () => number,
    sleep: (ms: number) => Promise<void>
  ) {
    this.minIntervalMs = minIntervalMs;
    this.now = now;
    this.sleep = sleep;
  }

  async wait(): Promise<void> {
    if (this.minIntervalMs <= 0) {
      return;
    }

    const now = this.now();
    const waitMs = Math.max(0, this.nextAllowedAt - now);
    this.nextAllowedAt = Math.max(now, this.nextAllowedAt) + this.minIntervalMs;

    if (waitMs > 0) {
      await this.sleep(waitMs);
    }
  }
}

interface AttemptResult {
  error?: QueryError;
  fares?: NormalizedFare[];
  noResultReason?: NoResultReason;
  requestId?: string;
}

const runAttempt = async (
  transport: FareCompareTransport,
  query: FareQuery,
  clientRequestId: string,
  timeoutMs: number,
  nowMs: number
): Promise<AttemptResult> => {
  let payload: unknown;

  try {
    validateQuery(query);
    payload = await transport.post(
      ENDPOINT,
      toRequestBody(query, clientRequestId),
      { timeoutMs }
    );
  } catch (error) {
    return { error: errorFromException(error) };
  }

  const body = asRecord(payload);

  if (!body || typeof body.status !== "number") {
    return {
      error: {
        kind: "malformed",
        message: "response body is missing a numeric `status` field",
        retryable: false,
      },
    };
  }

  const requestId = readRequestId(body);
  const { status } = body;
  const msg = typeof body.msg === "string" ? body.msg : null;

  if (status !== 0 && !EMPTY_RESULT_STATUSES.has(status)) {
    return {
      error: errorFromApiStatus(status, msg),
      ...(requestId === undefined ? {} : { requestId }),
    };
  }

  const noResultReason = readNoResultReason(body.noResultReason);

  return {
    fares: normalizeRoutings(body.routings, query, nowMs),
    ...(noResultReason === undefined ? {} : { noResultReason }),
    ...(requestId === undefined ? {} : { requestId }),
  };
};

interface RunQueryConfig {
  log: (entry: LogEntry) => void;
  maxRetries: number;
  newRequestId: () => string;
  now: () => number;
  rateGate: RateGate;
  retryBaseDelayMs: number;
  sleep: (ms: number) => Promise<void>;
  timeoutMs: number;
}

interface RunQueryResult {
  fares: NormalizedFare[];
  outcome: QueryOutcome;
  /** Retries also bill against the daily quota, so they are counted here. */
  requestsSent: number;
}

const runQuery = async (
  transport: FareCompareTransport,
  query: FareQuery,
  config: RunQueryConfig
): Promise<RunQueryResult> => {
  const startedAt = config.now();
  const route = `${query.origin}-${query.destination}`;

  let attempt = 0;
  let requestsSent = 0;
  let lastError: QueryError | undefined;
  let lastRequestId: string | undefined;
  let clientRequestId = config.newRequestId();

  while (attempt <= config.maxRetries) {
    attempt += 1;
    clientRequestId = config.newRequestId();

    // Sequential by design: retries must be paced, not fired in parallel.
    // oxlint-disable-next-line eslint/no-await-in-loop
    await config.rateGate.wait();
    config.log({
      attempt,
      clientRequestId,
      event: "attempt",
      queryId: query.id,
      route,
    });

    requestsSent += 1;
    // oxlint-disable-next-line eslint/no-await-in-loop
    const result = await runAttempt(
      transport,
      query,
      clientRequestId,
      config.timeoutMs,
      config.now()
    );

    lastRequestId = result.requestId ?? lastRequestId;

    if (!result.error) {
      const fares = result.fares ?? [];
      const durationMs = config.now() - startedAt;

      config.log({
        attempt,
        clientRequestId,
        durationMs,
        event: "success",
        message: `${fares.length} fare(s)`,
        queryId: query.id,
        requestId: lastRequestId,
        route,
      });

      return {
        fares,
        outcome: {
          attempts: attempt,
          clientRequestId,
          durationMs,
          fareCount: fares.length,
          query,
          queryId: query.id,
          status: fares.length > 0 ? "ok" : "empty",
          ...(result.noResultReason === undefined
            ? {}
            : { noResultReason: result.noResultReason }),
          ...(lastRequestId === undefined ? {} : { requestId: lastRequestId }),
        },
        requestsSent,
      };
    }

    lastError = result.error;

    if (!(result.error.retryable && attempt <= config.maxRetries)) {
      break;
    }

    const backoffMs = Math.round(
      config.retryBaseDelayMs *
        2 ** (attempt - 1) *
        (1 + Math.random() * JITTER_RATIO)
    );

    config.log({
      attempt,
      clientRequestId,
      event: "retry",
      message: `${result.error.kind}: ${result.error.message} — retrying in ${backoffMs}ms`,
      queryId: query.id,
      requestId: lastRequestId,
      route,
    });

    // Backoff must elapse before the next attempt.
    // oxlint-disable-next-line eslint/no-await-in-loop
    await config.sleep(backoffMs);
  }

  const durationMs = config.now() - startedAt;
  const error: QueryError = lastError ?? {
    kind: "network",
    message: "unknown failure",
    retryable: false,
  };

  config.log({
    attempt,
    clientRequestId,
    durationMs,
    event: "failure",
    message: `${error.kind}: ${error.message}`,
    queryId: query.id,
    requestId: lastRequestId,
    route,
  });

  return {
    fares: [],
    outcome: {
      attempts: attempt,
      clientRequestId,
      durationMs,
      error,
      fareCount: 0,
      query,
      queryId: query.id,
      status: "error",
      ...(lastRequestId === undefined ? {} : { requestId: lastRequestId }),
    },
    requestsSent,
  };
};

/**
 * Executes a batch of fare comparison queries with bounded concurrency, QPS
 * pacing, per-request timeouts, retries and full error collection. A per-query
 * failure never throws — every query lands in `outcomes`.
 */
export const runFareCompareBatch = async (
  transport: FareCompareTransport,
  queries: FareQuery[],
  options: BatchOptions = {}
): Promise<BatchResult> => {
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? defaultSleep;
  const log: (entry: LogEntry) => void = options.logger ?? noopLogger;
  const stopOnFatalError = options.stopOnFatalError ?? true;
  const concurrency = Math.max(1, options.concurrency ?? DEFAULTS.concurrency);

  const runQueryConfig = {
    log,
    maxRetries: Math.max(0, options.maxRetries ?? DEFAULTS.maxRetries),
    newRequestId: () => crypto.randomUUID(),
    now,
    rateGate: new RateGate(
      options.minIntervalMs ?? DEFAULTS.minIntervalMs,
      now,
      sleep
    ),
    retryBaseDelayMs: options.retryBaseDelayMs ?? DEFAULTS.retryBaseDelayMs,
    sleep,
    timeoutMs: options.timeoutMs ?? DEFAULTS.timeoutMs,
  } satisfies RunQueryConfig;

  const startedAt = now();
  const outcomes: QueryOutcome[] = [];
  const fares: NormalizedFare[] = [];

  let cursor = 0;
  let requestsSent = 0;
  /**
   * Budget is reserved before dispatch, not counted after. Counting after lets
   * every worker pass the check simultaneously and blow past `maxRequests`.
   */
  let requestsReserved = 0;
  let budgetHit = false;
  let aborted = false;
  let abortReason: string | undefined;

  const { maxRequests } = options;

  const worker = async (): Promise<void> => {
    while (!aborted) {
      if (maxRequests !== undefined && requestsReserved >= maxRequests) {
        budgetHit = true;
        return;
      }

      const query = queries[cursor];
      cursor += 1;

      if (!query) {
        return;
      }

      // Reserve this query's whole retry allowance up front, then refund what
      // it did not use, so retries can never overshoot the budget either.
      const remaining =
        maxRequests === undefined
          ? Number.POSITIVE_INFINITY
          : maxRequests - requestsReserved;
      const attemptsAllowed = Math.max(
        1,
        Math.min(runQueryConfig.maxRetries + 1, remaining)
      );
      requestsReserved += attemptsAllowed;

      // One query at a time per worker — parallelism comes from the worker
      // pool, so that `concurrency` stays an actual cap.
      // oxlint-disable-next-line eslint/no-await-in-loop
      const result = await runQuery(transport, query, {
        ...runQueryConfig,
        maxRetries: attemptsAllowed - 1,
      });

      requestsReserved -= attemptsAllowed - result.requestsSent;
      requestsSent += result.requestsSent;
      outcomes.push(result.outcome);
      fares.push(...result.fares);
      options.onProgress?.(result.outcome);

      const { error } = result.outcome;

      if (error && stopOnFatalError && isFatalError(error)) {
        aborted = true;
        abortReason = `${error.kind}: ${error.message}`;
        log({
          attempt: result.outcome.attempts,
          clientRequestId: result.outcome.clientRequestId,
          event: "abort",
          message: abortReason,
          queryId: result.outcome.queryId,
          route: `${query.origin}-${query.destination}`,
        });
        return;
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, queries.length) }, () =>
      worker()
    )
  );

  if (!aborted && budgetHit) {
    aborted = true;
    abortReason = `request budget of ${maxRequests} reached`;
  }

  return {
    aborted,
    fares,
    outcomes,
    stats: {
      emptyQueries: outcomes.filter((outcome) => outcome.status === "empty")
        .length,
      failedQueries: outcomes.filter((outcome) => outcome.status === "error")
        .length,
      okQueries: outcomes.filter((outcome) => outcome.status === "ok").length,
      requestsSent,
      totalFares: fares.length,
      totalQueries: outcomes.length,
      wallClockMs: now() - startedAt,
    },
    ...(abortReason === undefined ? {} : { abortReason }),
  };
};
