#!/usr/bin/env bun
/**
 * Pre-sales batch fare comparison CLI.
 *
 *   bun scripts/fare-compare.ts --spec ./presales.json --out ./report
 *
 * Reads ATLAS_API_URL / ATLAS_CLIENT_ID / ATLAS_CLIENT_SECRET from the
 * environment. The secret key stays on this side — nothing here is bundled for
 * the browser.
 *
 * Spec file shape (all arrays are expanded into a cartesian product):
 *
 * {
 *   "origins": ["CJJ"],
 *   "destinations": ["CJU"],
 *   "departureDates": ["2026-08-30", "2026-09-06"],
 *   "returnDates": [null],
 *   "currencies": ["USD"],
 *   "airlineFilters": [[]],
 *   "passengers": [{ "adults": 1, "children": 0, "infants": 0 }]
 * }
 */

import { writeFile } from "node:fs/promises";

import { renderCsv } from "../packages/atlas/src/fare-compare/report";
import { runFareCompare } from "../packages/atlas/src/fare-compare/run";
import type {
  FareQuerySpec,
  LogEntry,
} from "../packages/atlas/src/fare-compare/types";

const readFlag = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
};

const readNumberFlag = (name: string): number | undefined => {
  const raw = readFlag(name);
  if (raw === undefined) {
    return;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
};

/** `null` is accepted in JSON where the type wants `undefined`. */
const nullsToUndefined = (
  values: (string | null)[] | undefined
): (string | undefined)[] | undefined =>
  values?.map((value) => value ?? undefined);

const loadSpec = async (path: string): Promise<FareQuerySpec> => {
  const file = Bun.file(path);

  if (!(await file.exists())) {
    throw new Error(`Spec file not found: ${path}`);
  }

  const raw = (await file.json()) as FareQuerySpec & {
    currencies?: (string | null)[];
    returnDates?: (string | null)[];
  };

  return {
    ...raw,
    ...(raw.currencies === undefined
      ? {}
      : { currencies: nullsToUndefined(raw.currencies) }),
    ...(raw.returnDates === undefined
      ? {}
      : { returnDates: nullsToUndefined(raw.returnDates) }),
  };
};

const main = async () => {
  const specPath = readFlag("spec");

  if (!specPath) {
    process.stderr.write(
      "Usage: bun scripts/fare-compare.ts --spec <file.json> [--out <prefix>] [--concurrency N] [--max-requests N] [--timeout MS] [--verbose]\n"
    );
    process.exitCode = 1;
    return;
  }

  const spec = await loadSpec(specPath);
  const verbose = process.argv.includes("--verbose");

  const logger = (entry: LogEntry) => {
    if (!verbose && entry.event === "attempt") {
      return;
    }
    process.stderr.write(
      `[${entry.event}] ${entry.route} ${entry.queryId} attempt=${entry.attempt} reqId=${entry.requestId ?? "-"} clientReqId=${entry.clientRequestId}${entry.message ? ` — ${entry.message}` : ""}\n`
    );
  };

  const { markdown, result } = await runFareCompare(
    {
      apiUrl: requireEnv("ATLAS_API_URL"),
      clientId: requireEnv("ATLAS_CLIENT_ID"),
      clientSecret: requireEnv("ATLAS_CLIENT_SECRET"),
    },
    spec,
    {
      logger,
      ...(readNumberFlag("concurrency") === undefined
        ? {}
        : { concurrency: readNumberFlag("concurrency") }),
      ...(readNumberFlag("max-requests") === undefined
        ? {}
        : { maxRequests: readNumberFlag("max-requests") }),
      ...(readNumberFlag("timeout") === undefined
        ? {}
        : { timeoutMs: readNumberFlag("timeout") }),
    }
  );

  const outPrefix = readFlag("out");

  if (outPrefix) {
    await writeFile(`${outPrefix}.md`, markdown, "utf-8");
    await writeFile(`${outPrefix}.csv`, renderCsv(result.fares), "utf-8");
    process.stderr.write(`Wrote ${outPrefix}.md and ${outPrefix}.csv\n`);
  } else {
    process.stdout.write(markdown);
  }

  if (result.stats.failedQueries > 0 || result.aborted) {
    process.exitCode = 1;
  }
};

await main();
