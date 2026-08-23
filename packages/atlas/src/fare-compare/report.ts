import type {
  BatchResult,
  NormalizedFare,
  QueryError,
  QueryOutcome,
} from "./types";

/**
 * Turns a batch result into a pre-sales comparison report.
 *
 * Comparison rule: fares are only ever compared within the same settlement
 * currency. `displayCurrency` is presentation-only per the API reference and is
 * never used for ranking, spreads or totals. A route/date cell that returned
 * more than one settlement currency is reported as mixed rather than compared.
 */

export interface CellSummary {
  airline: string;
  baggageIncluded: boolean;
  cheapestTotal: number;
  currency: string;
  fareCount: number;
  flightNumbers: string[];
  sellable: boolean;
}

export interface RouteDateRow {
  /** Airline code -> cheapest offer for that airline. */
  byAirline: Map<string, CellSummary>;
  cheapestAirline?: string;
  cheapestTotal?: number;
  currencies: string[];
  date: string;
  dearestTotal?: number;
  mixedCurrency: boolean;
  route: string;
  /** `dearestTotal - cheapestTotal`, only when a single currency applies. */
  spread?: number;
  spreadPct?: number;
}

export interface CoverageSummary {
  emptyQueries: number;
  failedQueries: number;
  okQueries: number;
  /** Share of queries that returned at least one fare. */
  priceCoveragePct: number;
  totalQueries: number;
}

export interface FareCompareReport {
  airlines: string[];
  coverage: CoverageSummary;
  noResultCodes: Map<string, number>;
  errorKinds: Map<string, number>;
  rows: RouteDateRow[];
}

const cellKey = (fare: NormalizedFare) =>
  `${fare.route}__${fare.departureDate}__${fare.returnDate ?? "ow"}`;

const summarize = (fares: NormalizedFare[]): CellSummary | undefined => {
  let cheapest: NormalizedFare | undefined;

  for (const fare of fares) {
    if (cheapest === undefined || fare.adultTotal < cheapest.adultTotal) {
      cheapest = fare;
    }
  }

  if (!cheapest) {
    return;
  }

  return {
    airline: cheapest.airline,
    baggageIncluded: cheapest.baggage.included,
    cheapestTotal: cheapest.adultTotal,
    currency: cheapest.currency,
    fareCount: fares.length,
    flightNumbers: cheapest.flightNumbers,
    sellable: cheapest.sellable,
  };
};

const tally = (values: string[]): Map<string, number> => {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return counts;
};

export const buildReport = (result: BatchResult): FareCompareReport => {
  const grouped = new Map<string, NormalizedFare[]>();

  for (const fare of result.fares) {
    const key = cellKey(fare);
    const bucket = grouped.get(key);

    if (bucket) {
      bucket.push(fare);
    } else {
      grouped.set(key, [fare]);
    }
  }

  const rows: RouteDateRow[] = [];
  const airlines = new Set<string>();

  for (const fares of grouped.values()) {
    const [first] = fares;

    if (!first) {
      continue;
    }

    const currencies = [
      ...new Set(fares.map((fare) => fare.currency)),
    ].toSorted();
    const mixedCurrency = currencies.length > 1;

    const byAirline = new Map<string, CellSummary>();
    for (const airline of new Set(fares.map((fare) => fare.airline))) {
      airlines.add(airline);
      const summary = summarize(
        fares.filter((fare) => fare.airline === airline)
      );
      if (summary) {
        byAirline.set(airline, summary);
      }
    }

    const row: RouteDateRow = {
      byAirline,
      currencies,
      date: first.departureDate,
      mixedCurrency,
      route: first.route,
    };

    // Ranking across airlines is only meaningful in a single currency.
    if (!mixedCurrency) {
      const totals = fares.map((fare) => fare.adultTotal);
      const cheapestTotal = Math.min(...totals);
      const dearestTotal = Math.max(...totals);
      const cheapestFare = fares.find(
        (fare) => fare.adultTotal === cheapestTotal
      );

      row.cheapestTotal = cheapestTotal;
      row.dearestTotal = dearestTotal;
      row.spread = dearestTotal - cheapestTotal;
      row.spreadPct =
        cheapestTotal > 0
          ? ((dearestTotal - cheapestTotal) / cheapestTotal) * 100
          : 0;

      if (cheapestFare) {
        row.cheapestAirline = cheapestFare.airline;
      }
    }

    rows.push(row);
  }

  const sortedRows = rows.toSorted(
    (a, b) => a.route.localeCompare(b.route) || a.date.localeCompare(b.date)
  );

  const { stats } = result;

  return {
    airlines: [...airlines].toSorted(),
    coverage: {
      emptyQueries: stats.emptyQueries,
      failedQueries: stats.failedQueries,
      okQueries: stats.okQueries,
      priceCoveragePct:
        stats.totalQueries === 0
          ? 0
          : (stats.okQueries / stats.totalQueries) * 100,
      totalQueries: stats.totalQueries,
    },
    errorKinds: tally(
      result.outcomes
        .map((outcome: QueryOutcome) => outcome.error?.kind)
        .filter((kind): kind is QueryError["kind"] => kind !== undefined)
    ),
    noResultCodes: tally(
      result.outcomes
        .map((outcome) => outcome.noResultReason?.code)
        .filter((code): code is string => code !== undefined)
    ),
    rows: sortedRows,
  };
};

const money = (value: number, currency: string) =>
  `${currency} ${value.toFixed(2)}`;

const mdRow = (cells: string[]) => `| ${cells.join(" | ")} |`;

const HEADER_LINES = [
  "# Pre-sales fare comparison",
  "",
  "> Source: `POST /priceCompareSearch.do`. Raw pre-sales pricing with maximum",
  "> route coverage — booking rules and supplier switches are not applied.",
  "> **Not a customer quote and not a production pricing source.**",
  "",
];

const coverageSection = (
  report: FareCompareReport,
  result: BatchResult
): string[] => [
  "## Coverage",
  "",
  mdRow(["Metric", "Value"]),
  mdRow(["---", "---"]),
  mdRow(["Queries", String(report.coverage.totalQueries)]),
  mdRow(["With fares", String(report.coverage.okQueries)]),
  mdRow(["Empty", String(report.coverage.emptyQueries)]),
  mdRow(["Failed", String(report.coverage.failedQueries)]),
  mdRow(["Price coverage", `${report.coverage.priceCoveragePct.toFixed(1)}%`]),
  mdRow(["Requests sent", String(result.stats.requestsSent)]),
  mdRow(["Wall clock", `${(result.stats.wallClockMs / 1000).toFixed(1)}s`]),
  ...(result.aborted ? [mdRow(["Aborted", result.abortReason ?? "yes"])] : []),
];

const airlineCell = (row: RouteDateRow, airline: string): string => {
  const summary = row.byAirline.get(airline);

  if (!summary) {
    return "—";
  }

  const flags = [
    ...(summary.baggageIncluded ? ["bag"] : []),
    ...(summary.sellable ? [] : ["not sellable"]),
  ];
  const suffix = flags.length > 0 ? ` (${flags.join(", ")})` : "";

  return `${money(summary.cheapestTotal, summary.currency)}${suffix}`;
};

const tableSection = (report: FareCompareReport): string[] => {
  const heading = [
    "",
    "## Cheapest adult total by route, date and airline",
    "",
  ];

  if (report.rows.length === 0) {
    return [...heading, "_No fares returned._"];
  }

  const header = ["Route", "Date", ...report.airlines, "Cheapest", "Spread"];

  const body = report.rows.map((row) => {
    const cells = report.airlines.map((airline) => airlineCell(row, airline));
    const currency = row.currencies[0] ?? "";

    const cheapest = row.mixedCurrency
      ? `mixed: ${row.currencies.join(", ")}`
      : `${row.cheapestAirline ?? "—"} ${
          row.cheapestTotal === undefined
            ? ""
            : money(row.cheapestTotal, currency)
        }`.trim();

    const spread =
      row.mixedCurrency || row.spread === undefined
        ? "n/a"
        : `${money(row.spread, currency)} (${row.spreadPct?.toFixed(1)}%)`;

    return mdRow([row.route, row.date, ...cells, cheapest, spread]);
  });

  return [...heading, mdRow(header), mdRow(header.map(() => "---")), ...body];
};

const countsSection = (
  title: string,
  label: string,
  counts: Map<string, number>
): string[] =>
  counts.size === 0
    ? []
    : [
        "",
        `## ${title}`,
        "",
        mdRow([label, "Queries"]),
        mdRow(["---", "---"]),
        ...[...counts].map(([key, count]) => mdRow([key, String(count)])),
      ];

const failureDetailSection = (
  report: FareCompareReport,
  result: BatchResult
): string[] =>
  report.errorKinds.size === 0
    ? []
    : [
        "",
        "Failed queries with Atlas request ids:",
        "",
        ...result.outcomes
          .filter((outcome) => outcome.error !== undefined)
          .map(
            (outcome) =>
              `- \`${outcome.queryId}\` — ${outcome.error?.kind}: ${outcome.error?.message} (requestId: ${outcome.requestId ?? "n/a"}, clientRequestId: ${outcome.clientRequestId})`
          ),
      ];

/** Renders the report as Markdown, suitable for a pre-sales hand-off. */
export const renderMarkdownReport = (
  report: FareCompareReport,
  result: BatchResult
): string => {
  const lines = [
    ...HEADER_LINES,
    ...coverageSection(report, result),
    ...tableSection(report),
    ...countsSection(
      "Why queries returned nothing",
      "Reason",
      report.noResultCodes
    ),
    ...countsSection("Errors", "Kind", report.errorKinds),
    ...failureDetailSection(report, result),
  ];

  return `${lines.join("\n")}\n`;
};

const CSV_QUOTE_PATTERN = /["\n,]/u;

const csvCell = (value: string | number | boolean | undefined) => {
  const text = value === undefined ? "" : String(value);
  return CSV_QUOTE_PATTERN.test(text)
    ? `"${text.replaceAll('"', '""')}"`
    : text;
};

/** Flat CSV of every normalized fare, for spreadsheet analysis. */
export const renderCsv = (fares: NormalizedFare[]): string => {
  const header = [
    "route",
    "tripType",
    "departureDate",
    "returnDate",
    "airline",
    "operatingAirline",
    "flightNumbers",
    "cabin",
    "stops",
    "currency",
    "adultPrice",
    "adultTax",
    "transactionFeePerPax",
    "adultTotal",
    "baggageIncluded",
    "baggage",
    "seatCount",
    "sellable",
    "sellableReason",
  ];

  const rows = fares.map((fare) =>
    [
      fare.route,
      fare.tripType,
      fare.departureDate,
      fare.returnDate,
      fare.airline,
      fare.operatingAirline,
      fare.flightNumbers.join(" "),
      fare.cabin,
      fare.stops,
      fare.currency,
      fare.adultPrice,
      fare.adultTax,
      fare.transactionFeePerPax,
      fare.adultTotal,
      fare.baggage.included,
      fare.baggage.description,
      fare.seatCount,
      fare.sellable,
      fare.sellableReason,
    ].map(csvCell)
  );

  return [header.join(","), ...rows.map((row) => row.join(","))].join("\n");
};
