/**
 * Pre-sales batch fare comparison, from the command line.
 *
 * The batch runner and the report have existed for a while with nothing able
 * to call them: `normalizeRoutings` was imported in a few places, but
 * `runFareCompare` was not reachable from anywhere. This is the entry point,
 * so checking route coverage is a command rather than a throwaway script
 * written from scratch each time.
 *
 * Credentials come from the environment. They are never arguments: anything
 * typed at a shell lands in history, and the secret key is the one value in
 * this repo that must not.
 *
 *   bun run fare-compare --from KUL --to SIN,BKK --dates 2026-09-16,2026-09-23
 */

import { runFareCompare } from "../src/fare-compare/run";
import type { FareCompareCredentials } from "../src/fare-compare/run";
import type { BatchOptions, FareQuerySpec } from "../src/fare-compare/types";

const USAGE = `
Usage
  bun run fare-compare --from <IATA,…> --to <IATA,…> --dates <YYYY-MM-DD,…> [options]

Required
  --from <codes>       Origin airports, comma separated
  --to <codes>         Destination airports, comma separated
  --dates <dates>      Departure dates, comma separated

Options
  --return <dates>     Return dates. Omit for one-way.
  --currency <codes>   Reference currencies. Omit for airline quotation currency.
  --airlines <codes>   Restrict to these carriers. Omit for all.
  --adults <n>         Default 1
  --children <n>       Default 0
  --infants <n>        Default 0
  --concurrency <n>    Max in-flight requests. Default 4.
  --max-requests <n>   Hard cap on requests sent, to protect the daily quota.
  --timeout <ms>       Per-request timeout. Default 30000.
  --json               Print the report as JSON instead of markdown.

Every origin × destination × date × currency × airline-filter × passenger
combination becomes one query, so a wide batch grows fast. --max-requests is
the brake.

Environment
  ATLAS_API_URL, ATLAS_CLIENT_ID, ATLAS_CLIENT_SECRET
`;

const parseArgs = (argv: string[]): Map<string, string> => {
  const args = new Map<string, string>();

  let index = 0;

  while (index < argv.length) {
    const token = argv[index];

    if (!token?.startsWith("--")) {
      index += 1;
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];

    // A flag with no value is a boolean; anything else consumes the next token.
    if (next === undefined || next.startsWith("--")) {
      args.set(key, "true");
      index += 1;
      continue;
    }

    args.set(key, next);
    index += 2;
  }

  return args;
};

const list = (value: string | undefined): string[] =>
  value
    ? value
        .split(",")
        .map((entry) => entry.trim().toUpperCase())
        .filter(Boolean)
    : [];

const count = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const credentialsFromEnv = (): FareCompareCredentials => {
  const apiUrl = process.env.ATLAS_API_URL;
  const clientId = process.env.ATLAS_CLIENT_ID;
  const clientSecret = process.env.ATLAS_CLIENT_SECRET;

  if (!(apiUrl && clientId && clientSecret)) {
    // Named individually: "credentials missing" sends people hunting through
    // three variables to find which one it was.
    const missing = [
      apiUrl ? null : "ATLAS_API_URL",
      clientId ? null : "ATLAS_CLIENT_ID",
      clientSecret ? null : "ATLAS_CLIENT_SECRET",
    ].filter(Boolean);

    throw new Error(`Not set: ${missing.join(", ")}`);
  }

  return { apiUrl, clientId, clientSecret };
};

const buildSpec = (args: Map<string, string>): FareQuerySpec => {
  const origins = list(args.get("from"));
  const destinations = list(args.get("to"));
  const departureDates = list(args.get("dates"));

  if (!(origins.length && destinations.length && departureDates.length)) {
    throw new Error("--from, --to and --dates are all required.");
  }

  const returnDates = list(args.get("return"));
  const currencies = list(args.get("currency"));
  const airlines = list(args.get("airlines"));

  return {
    departureDates,
    destinations,
    origins,
    passengers: [
      {
        adults: count(args.get("adults"), 1),
        children: count(args.get("children"), 0),
        infants: count(args.get("infants"), 0),
      },
    ],
    ...(currencies.length > 0 ? { currencies } : {}),
    // `[]` is the documented "all airlines" filter, so an empty --airlines is
    // one query rather than none.
    ...(airlines.length > 0 ? { airlineFilters: [airlines] } : {}),
    ...(returnDates.length > 0 ? { returnDates } : {}),
  };
};

const buildOptions = (args: Map<string, string>): BatchOptions => {
  const options: BatchOptions = {};
  const concurrency = args.get("concurrency");
  const maxRequests = args.get("max-requests");
  const timeout = args.get("timeout");

  if (concurrency) {
    options.concurrency = count(concurrency, 4);
  }

  if (maxRequests) {
    options.maxRequests = count(maxRequests, 0);
  }

  if (timeout) {
    options.timeoutMs = count(timeout, 30_000);
  }

  return options;
};

const main = async (): Promise<number> => {
  const args = parseArgs(process.argv.slice(2));

  if (args.has("help") || args.size === 0) {
    process.stdout.write(USAGE);
    return 0;
  }

  const spec = buildSpec(args);
  const options = buildOptions(args);
  // Progress on stderr, report on stdout: piping the report into a file should
  // not capture the chatter, and a long batch should not look frozen.
  let done = 0;

  options.onProgress = (outcome) => {
    done += 1;
    process.stderr.write(
      `  ${done} ${outcome.query.origin}-${outcome.query.destination} ${outcome.query.departureDate} ${outcome.status}\n`
    );
  };

  const { markdown, report } = await runFareCompare(
    credentialsFromEnv(),
    spec,
    options
  );

  process.stdout.write(
    args.has("json") ? `${JSON.stringify(report, null, 2)}\n` : `${markdown}\n`
  );

  return 0;
};

try {
  process.exit(await main());
} catch (error) {
  // The message alone, not a stack. A missing variable or a bad date is a
  // thing to fix in the command, and forty lines of trace buries it.
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exit(1);
}
