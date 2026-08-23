import { describe, expect, test } from "bun:test";

import {
  atlasMalformedResponseError,
  atlasTimeoutError,
} from "../atlas-api-error";
import { runFareCompareBatch } from "./batch";
import type { FareCompareTransport } from "./batch";
import { expandQueries, FareQueryValidationError } from "./expand";
import { buildReport, renderMarkdownReport } from "./report";
import type { BatchOptions, FareQuery } from "./types";

const BASE_SPEC = {
  departureDates: ["2026-08-30"],
  destinations: ["CJU"],
  origins: ["CJJ"],
};

/** No real timers or clocks — the batch runner takes both as injectables. */
const testOptions = (extra: BatchOptions = {}): BatchOptions => {
  let clock = 0;

  return {
    concurrency: 2,
    maxRetries: 1,
    minIntervalMs: 0,
    now: () => {
      clock += 1;
      return clock;
    },
    retryBaseDelayMs: 0,
    sleep: () => Promise.resolve(),
    ...extra,
  };
};

const routing = (overrides: Record<string, unknown> = {}) => ({
  adultPrice: 100,
  adultTax: 20,
  currency: "USD",
  expireTime: "2099-01-01T00:00:00Z",
  fromSegments: [
    {
      arrAirport: "CJU",
      arrTime: "2026-08-30T11:00:00",
      cabinClass: "Y",
      carrier: "7C",
      depAirport: "CJJ",
      depTime: "2026-08-30T09:00:00",
      duration: 70,
      flightNumber: "7C501",
      seatCount: 9,
    },
  ],
  routingIdentifier: "rid-1",
  rules: {
    baggageElements: [{ passengerType: "ADT", piece: 1, weight: 15 }],
    hasBaggage: 1,
  },
  transactionFeePerPax: 5,
  ...overrides,
});

const okBody = (routings: unknown[]) => ({
  msg: "success",
  requestId: "atlas-req-1",
  routings,
  status: 0,
});

const stubTransport = (
  handler: (body: unknown, callIndex: number) => Promise<unknown>
): FareCompareTransport & { calls: unknown[] } => {
  const calls: unknown[] = [];

  return {
    calls,
    post: (_path, body) => {
      calls.push(body);
      return handler(body, calls.length - 1);
    },
  };
};

describe("expandQueries", () => {
  test("expands the cartesian product across every dimension", () => {
    const queries = expandQueries({
      airlineFilters: [[], ["7C"]],
      currencies: ["USD", "KRW"],
      departureDates: ["2026-08-30", "2026-09-06"],
      destinations: ["CJU"],
      origins: ["CJJ", "ICN"],
      passengers: [{ adults: 1, children: 0, infants: 0 }],
      returnDates: [undefined, "2026-09-10"],
    });

    // 2 origins x 1 dest x 2 dep x 2 ret x 2 currency x 2 airline filters
    expect(queries).toHaveLength(32);
    expect(new Set(queries.map((query) => query.id)).size).toBe(32);
  });

  test("normalises dates to YYYYMMDD and drops same-city pairs", () => {
    const queries = expandQueries({
      departureDates: ["2026-08-30"],
      destinations: ["CJU", "CJJ"],
      origins: ["CJJ"],
    });

    expect(queries).toHaveLength(1);
    expect(queries[0]?.departureDate).toBe("20260830");
  });

  test("rejects an infant count above the adult count", () => {
    expect(() =>
      expandQueries({
        ...BASE_SPEC,
        passengers: [{ adults: 1, children: 0, infants: 2 }],
      })
    ).toThrow(FareQueryValidationError);
  });
});

describe("runFareCompareBatch — success", () => {
  test("normalises fares across a multi-query batch", async () => {
    const queries = expandQueries({
      ...BASE_SPEC,
      departureDates: ["2026-08-30", "2026-09-06"],
    });

    const transport = stubTransport(() =>
      Promise.resolve(okBody([routing(), routing({ adultPrice: 150 })]))
    );

    const result = await runFareCompareBatch(transport, queries, testOptions());

    expect(result.stats.totalQueries).toBe(2);
    expect(result.stats.okQueries).toBe(2);
    expect(result.stats.requestsSent).toBe(2);
    expect(result.fares).toHaveLength(4);

    const [fare] = result.fares;
    expect(fare?.route).toBe("CJJ-CJU");
    expect(fare?.airline).toBe("7C");
    expect(fare?.flightNumbers).toEqual(["7C501"]);
    expect(fare?.currency).toBe("USD");
    // adultPrice + adultTax + transactionFeePerPax
    expect(fare?.adultTotal).toBe(125);
    expect(fare?.baggage.included).toBe(true);
    expect(fare?.baggage.pieces).toBe(1);
    expect(fare?.sellable).toBe(true);
    expect(fare?.tripType).toBe("one-way");
  });

  test("sends the documented request body and keeps the Atlas request id", async () => {
    const queries = expandQueries({ ...BASE_SPEC, currencies: ["USD"] });
    const transport = stubTransport(() => Promise.resolve(okBody([routing()])));

    const result = await runFareCompareBatch(transport, queries, testOptions());

    const body = transport.calls[0] as Record<string, unknown>;
    expect(body.tripType).toBe("1");
    expect(body.fromCity).toBe("CJJ");
    expect(body.toCity).toBe("CJU");
    expect(body.fromDate).toBe("20260830");
    expect(body.adultNum).toBe(1);
    expect(body.currency).toBe("USD");

    // `requestId` is issued by Atlas, not by us. The live sandbox rejects a
    // self-generated one, so it is never sent.
    expect(body.requestId).toBeUndefined();

    // We still generate a local correlation id for logging, and keep the id
    // Atlas returned for support tickets.
    expect(result.outcomes[0]?.requestId).toBe("atlas-req-1");
    expect(typeof result.outcomes[0]?.clientRequestId).toBe("string");
  });

  test("marks a sold-out routing as not sellable", async () => {
    const queries = expandQueries(BASE_SPEC);
    const transport = stubTransport(() =>
      Promise.resolve(
        okBody([
          routing({
            fromSegments: [
              { carrier: "7C", flightNumber: "7C501", seatCount: 0 },
            ],
          }),
        ])
      )
    );

    const result = await runFareCompareBatch(transport, queries, testOptions());

    expect(result.fares[0]?.sellable).toBe(false);
    expect(result.fares[0]?.sellableReason).toBe("no seats remaining");
  });
});

describe("runFareCompareBatch — empty result", () => {
  test("records status empty and keeps the noResultReason", async () => {
    const queries = expandQueries(BASE_SPEC);
    const transport = stubTransport(() =>
      Promise.resolve({
        msg: "success",
        noResultReason: {
          code: "ROUTE_NOT_SUPPORTED",
          message: "no carrier files this OD",
          recentFlightDates: ["20260901"],
        },
        routings: [],
        status: 0,
      })
    );

    const result = await runFareCompareBatch(transport, queries, testOptions());

    expect(result.stats.emptyQueries).toBe(1);
    expect(result.stats.okQueries).toBe(0);
    expect(result.fares).toHaveLength(0);
    expect(result.outcomes[0]?.status).toBe("empty");
    expect(result.outcomes[0]?.noResultReason?.code).toBe(
      "ROUTE_NOT_SUPPORTED"
    );
    expect(result.outcomes[0]?.error).toBeUndefined();
  });

  test("treats business status 114 as empty rather than an error", async () => {
    const queries = expandQueries(BASE_SPEC);
    const transport = stubTransport(() =>
      Promise.resolve({
        msg: "No flights available",
        routings: [],
        status: 114,
      })
    );

    const result = await runFareCompareBatch(transport, queries, testOptions());

    expect(result.outcomes[0]?.status).toBe("empty");
    expect(result.stats.failedQueries).toBe(0);
  });
});

describe("runFareCompareBatch — auth failure", () => {
  test("aborts the batch on status 900 without retrying", async () => {
    const queries = expandQueries({
      ...BASE_SPEC,
      departureDates: ["2026-08-30", "2026-09-06", "2026-09-13"],
    });

    const transport = stubTransport(() =>
      Promise.resolve({ msg: "Unauthorized", routings: [], status: 900 })
    );

    const result = await runFareCompareBatch(
      transport,
      queries,
      testOptions({ concurrency: 1 })
    );

    expect(result.aborted).toBe(true);
    expect(result.abortReason).toContain("auth");
    expect(result.outcomes[0]?.error?.kind).toBe("auth");
    expect(result.outcomes[0]?.error?.retryable).toBe(false);
    expect(result.outcomes[0]?.attempts).toBe(1);
    // Stopped early instead of burning quota on the remaining queries.
    expect(result.stats.requestsSent).toBeLessThan(queries.length);
  });
});

describe("runFareCompareBatch — timeout", () => {
  test("retries a timeout then records the failure", async () => {
    const queries = expandQueries(BASE_SPEC);
    const transport = stubTransport(() =>
      Promise.reject(atlasTimeoutError("https://api.example/x", 30_000))
    );

    const result = await runFareCompareBatch(
      transport,
      queries,
      testOptions({ maxRetries: 2 })
    );

    expect(result.outcomes[0]?.status).toBe("error");
    expect(result.outcomes[0]?.error?.kind).toBe("timeout");
    expect(result.outcomes[0]?.error?.retryable).toBe(true);
    // 1 initial attempt + 2 retries
    expect(result.outcomes[0]?.attempts).toBe(3);
    expect(result.stats.requestsSent).toBe(3);
  });

  test("recovers when a retry succeeds", async () => {
    const queries = expandQueries(BASE_SPEC);
    const transport = stubTransport((_body, callIndex) =>
      callIndex === 0
        ? Promise.reject(atlasTimeoutError("https://api.example/x", 1000))
        : Promise.resolve(okBody([routing()]))
    );

    const result = await runFareCompareBatch(transport, queries, testOptions());

    expect(result.outcomes[0]?.status).toBe("ok");
    expect(result.outcomes[0]?.attempts).toBe(2);
    expect(result.fares).toHaveLength(1);
  });

  test("passes the configured timeout down to the transport", async () => {
    const queries = expandQueries(BASE_SPEC);
    let seenTimeout: number | undefined;

    const transport: FareCompareTransport = {
      post: (_path, _body, options) => {
        seenTimeout = options.timeoutMs;
        return Promise.resolve(okBody([]));
      },
    };

    await runFareCompareBatch(
      transport,
      queries,
      testOptions({ timeoutMs: 12_345 })
    );

    expect(seenTimeout).toBe(12_345);
  });
});

describe("runFareCompareBatch — malformed response", () => {
  test("flags a body without a numeric status and does not retry", async () => {
    const queries = expandQueries(BASE_SPEC);
    const transport = stubTransport(() =>
      Promise.resolve({ unexpected: true })
    );

    const result = await runFareCompareBatch(transport, queries, testOptions());

    expect(result.outcomes[0]?.status).toBe("error");
    expect(result.outcomes[0]?.error?.kind).toBe("malformed");
    expect(result.outcomes[0]?.error?.retryable).toBe(false);
    expect(result.outcomes[0]?.attempts).toBe(1);
  });

  test("flags a non-JSON transport error", async () => {
    const queries = expandQueries(BASE_SPEC);
    const transport = stubTransport(() =>
      Promise.reject(
        atlasMalformedResponseError(
          "https://api.example/x",
          "text/html",
          "<html>502</html>"
        )
      )
    );

    const result = await runFareCompareBatch(transport, queries, testOptions());

    expect(result.outcomes[0]?.error?.kind).toBe("malformed");
  });

  test("survives routings whose shape is unexpected", async () => {
    const queries = expandQueries(BASE_SPEC);
    const transport = stubTransport(() =>
      Promise.resolve(
        okBody([null, "nonsense", { fromSegments: [] }, routing()])
      )
    );

    const result = await runFareCompareBatch(transport, queries, testOptions());

    // Only the one well-formed routing survives; the rest are dropped.
    expect(result.fares).toHaveLength(1);
    expect(result.outcomes[0]?.status).toBe("ok");
  });
});

describe("runFareCompareBatch — rate and quota control", () => {
  test("stops once the request budget is spent", async () => {
    const queries = expandQueries({
      ...BASE_SPEC,
      departureDates: ["2026-08-30", "2026-09-06", "2026-09-13", "2026-09-20"],
    });

    const transport = stubTransport(() => Promise.resolve(okBody([routing()])));

    const result = await runFareCompareBatch(
      transport,
      queries,
      testOptions({ concurrency: 1, maxRequests: 2 })
    );

    expect(result.stats.requestsSent).toBe(2);
    expect(result.aborted).toBe(true);
    expect(result.abortReason).toContain("request budget");
  });

  test("retries a QPS rejection", async () => {
    const queries = expandQueries(BASE_SPEC);
    const transport = stubTransport((_body, callIndex) =>
      callIndex === 0
        ? Promise.resolve({ msg: "QPS limit exceeded", status: 110 })
        : Promise.resolve(okBody([routing()]))
    );

    const result = await runFareCompareBatch(transport, queries, testOptions());

    expect(result.outcomes[0]?.status).toBe("ok");
    expect(result.outcomes[0]?.attempts).toBe(2);
  });
});

describe("buildReport", () => {
  const twoAirlineTransport = () =>
    stubTransport(() =>
      Promise.resolve(
        okBody([
          routing(),
          routing({
            adultPrice: 200,
            fromSegments: [
              {
                carrier: "KE",
                duration: 70,
                flightNumber: "KE1234",
                seatCount: 4,
              },
            ],
            routingIdentifier: "rid-2",
          }),
        ])
      )
    );

  const runReport = async () => {
    const queries = expandQueries(BASE_SPEC);
    const result = await runFareCompareBatch(
      twoAirlineTransport(),
      queries,
      testOptions()
    );
    return { report: buildReport(result), result };
  };

  test("ranks airlines and computes the spread within one currency", async () => {
    const { report } = await runReport();

    expect(report.airlines).toEqual(["7C", "KE"]);
    expect(report.rows).toHaveLength(1);

    const [row] = report.rows;
    expect(row?.cheapestAirline).toBe("7C");
    expect(row?.cheapestTotal).toBe(125);
    expect(row?.dearestTotal).toBe(225);
    expect(row?.spread).toBe(100);
    expect(row?.mixedCurrency).toBe(false);
    expect(row?.byAirline.get("KE")?.cheapestTotal).toBe(225);
  });

  test("reports coverage", async () => {
    const { report } = await runReport();

    expect(report.coverage.totalQueries).toBe(1);
    expect(report.coverage.okQueries).toBe(1);
    expect(report.coverage.priceCoveragePct).toBe(100);
  });

  test("refuses to compare across settlement currencies", async () => {
    const queries = expandQueries(BASE_SPEC);
    const transport = stubTransport(() =>
      Promise.resolve(
        okBody([routing(), routing({ adultPrice: 90_000, currency: "KRW" })])
      )
    );

    const result = await runFareCompareBatch(transport, queries, testOptions());
    const report = buildReport(result);
    const [row] = report.rows;

    expect(row?.mixedCurrency).toBe(true);
    expect(row?.currencies).toEqual(["KRW", "USD"]);
    expect(row?.spread).toBeUndefined();
    expect(row?.cheapestTotal).toBeUndefined();
  });

  test("renders markdown carrying the pre-sales caveat", async () => {
    const { report, result } = await runReport();
    const markdown = renderMarkdownReport(report, result);

    expect(markdown).toContain("Pre-sales fare comparison");
    expect(markdown).toContain("Not a customer quote");
    expect(markdown).toContain("CJJ-CJU");
    expect(markdown).toContain("Price coverage");
  });

  test("surfaces error kinds and request ids for failed queries", async () => {
    const queries: FareQuery[] = expandQueries(BASE_SPEC);
    const transport = stubTransport(() =>
      Promise.resolve({
        msg: "Internal error",
        requestId: "atlas-err",
        status: 9999,
      })
    );

    const result = await runFareCompareBatch(
      transport,
      queries,
      testOptions({ stopOnFatalError: false })
    );
    const report = buildReport(result);
    const markdown = renderMarkdownReport(report, result);

    expect(report.errorKinds.get("server")).toBe(1);
    expect(markdown).toContain("atlas-err");
  });
});
