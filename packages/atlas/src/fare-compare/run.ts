import { AtlasClient } from "../client";
import { runFareCompareBatch } from "./batch";
import type { FareCompareTransport } from "./batch";
import { expandQueries } from "./expand";
import { buildReport, renderMarkdownReport } from "./report";
import type { FareCompareReport } from "./report";
import type { BatchOptions, BatchResult, FareQuerySpec } from "./types";

/**
 * Server-only entry point. The secret key must never reach browser code, so
 * this module refuses to initialise in a document context. Import it from a
 * script, a server action or an agent tool — never from a client component.
 */
const assertServerOnly = () => {
  if ("window" in globalThis && "document" in globalThis) {
    throw new Error(
      "@atlas/atlas-client/fare-compare is server-only: the Atlas secret key must never be bundled into browser code."
    );
  }
};

export interface FareCompareCredentials {
  apiUrl: string;
  clientId: string;
  clientSecret: string;
  /**
   * Overrides the auth header names. Defaults to the documented
   * `x-atlas-client-id` / `x-atlas-client-secret`.
   */
  headerNames?: { clientId: string; clientSecret: string };
}

export const createFareCompareTransport = (
  credentials: FareCompareCredentials
): FareCompareTransport => {
  assertServerOnly();

  const client = new AtlasClient({
    apiUrl: credentials.apiUrl,
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret,
    ...(credentials.headerNames === undefined
      ? {}
      : { authHeaderNames: credentials.headerNames }),
  });

  return {
    post: (path, body, options) =>
      client.post<unknown>(path, body, { timeoutMs: options.timeoutMs }),
  };
};

export interface FareCompareRunResult {
  markdown: string;
  report: FareCompareReport;
  result: BatchResult;
}

/**
 * Expands a spec, runs the batch and builds the pre-sales report in one call.
 */
export const runFareCompare = async (
  credentials: FareCompareCredentials,
  spec: FareQuerySpec,
  options?: BatchOptions
): Promise<FareCompareRunResult> => {
  const transport = createFareCompareTransport(credentials);
  const queries = expandQueries(spec);
  const result = await runFareCompareBatch(transport, queries, options);
  const report = buildReport(result);

  return {
    markdown: renderMarkdownReport(report, result),
    report,
    result,
  };
};
