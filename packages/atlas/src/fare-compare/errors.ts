import { AtlasApiError } from "../atlas-api-error";
import { FareQueryValidationError } from "./expand";
import type { QueryError } from "./types";

/** Documented business status codes returned inside an HTTP 200 body. */
export const API_STATUS_MESSAGES: Record<number, string> = {
  100: "Missing or invalid request data",
  101: "Missing or invalid request data",
  102: "Missing or invalid request data",
  105: "OD not in whitelist",
  106: "Search not allowed",
  107: "Insufficient balance",
  108: "Route restricted",
  109: "Search limit or daily quota exceeded",
  110: "QPS limit exceeded",
  111: "Real-time search not allowed",
  112: "Search timeout",
  113: "Airline under maintenance",
  114: "No flights available",
  116: "Data not captured",
  124: "Unsupported settlement currency",
  900: "Unauthorized",
  9999: "Internal error",
};

/** Transient upstream conditions worth another attempt. */
const RETRYABLE_API_STATUSES = new Set([110, 112, 9999]);

/** Statuses that mean "no flights", not a failure. */
export const EMPTY_RESULT_STATUSES = new Set([114]);

/** Statuses where continuing the batch only burns quota or repeats a 401. */
const FATAL_API_STATUSES = new Set([107, 109, 900]);

export const isFatalStatus = (apiStatus: number | undefined): boolean =>
  apiStatus !== undefined && FATAL_API_STATUSES.has(apiStatus);

const kindForStatus = (apiStatus: number): QueryError["kind"] => {
  if (apiStatus === 900) {
    return "auth";
  }
  if (apiStatus === 107 || apiStatus === 109) {
    return "quota";
  }
  if (apiStatus === 110) {
    return "rate-limit";
  }
  if (apiStatus === 112) {
    return "timeout";
  }
  if (apiStatus === 9999) {
    return "server";
  }
  return "validation";
};

/** Maps an Atlas business status code onto a collected error. */
export const errorFromApiStatus = (
  apiStatus: number,
  msg: string | null | undefined
): QueryError => ({
  apiStatus,
  kind: kindForStatus(apiStatus),
  message: msg ?? API_STATUS_MESSAGES[apiStatus] ?? `Atlas status ${apiStatus}`,
  retryable: RETRYABLE_API_STATUSES.has(apiStatus),
});

const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_SERVER_ERROR = 500;

const errorFromHttpStatus = (
  statusCode: number,
  message: string
): QueryError => {
  if (statusCode === HTTP_UNAUTHORIZED || statusCode === HTTP_FORBIDDEN) {
    return { kind: "auth", message, retryable: false };
  }

  if (statusCode === HTTP_TOO_MANY_REQUESTS) {
    return { kind: "rate-limit", message, retryable: true };
  }

  const isServerError = statusCode >= HTTP_SERVER_ERROR;

  return {
    kind: isServerError ? "server" : "http",
    message,
    retryable: isServerError,
  };
};

/** Maps a thrown transport error onto a collected error. */
export const errorFromException = (error: unknown): QueryError => {
  if (error instanceof FareQueryValidationError) {
    return { kind: "validation", message: error.message, retryable: false };
  }

  if (error instanceof AtlasApiError) {
    if (error.kind === "timeout") {
      return { kind: "timeout", message: error.message, retryable: true };
    }

    if (error.kind === "malformed") {
      return { kind: "malformed", message: error.message, retryable: false };
    }

    if (error.statusCode !== undefined) {
      return errorFromHttpStatus(error.statusCode, error.message);
    }
  }

  return {
    kind: "network",
    message: error instanceof Error ? error.message : String(error),
    retryable: true,
  };
};

export const isFatalError = (error: QueryError): boolean =>
  error.kind === "auth" ||
  error.kind === "quota" ||
  isFatalStatus(error.apiStatus);
