/**
 * How a transport-level call failed. Business errors are NOT represented here —
 * those arrive as HTTP 200 with a non-zero `status` in the body.
 */
export type AtlasErrorKind = "http" | "malformed" | "timeout";

export interface AtlasErrorDetail {
  body?: string;
  contentType?: string | null;
  statusCode?: number;
  timeoutMs?: number;
}

/** Single transport error type; discriminate on `kind`. */
export class AtlasApiError extends Error {
  readonly body: string | undefined;
  readonly kind: AtlasErrorKind;
  readonly statusCode: number | undefined;
  readonly timeoutMs: number | undefined;

  constructor(kind: AtlasErrorKind, message: string, detail: AtlasErrorDetail) {
    super(message);
    this.body = detail.body;
    this.kind = kind;
    this.name = "AtlasApiError";
    this.statusCode = detail.statusCode;
    this.timeoutMs = detail.timeoutMs;
  }
}

const HTTP_BODY_PREVIEW = 500;
const NON_JSON_PREVIEW = 200;

export const atlasTimeoutError = (
  url: string,
  timeoutMs: number | undefined
): AtlasApiError =>
  new AtlasApiError(
    "timeout",
    timeoutMs === undefined
      ? `Atlas API request to ${url} was aborted`
      : `Atlas API request to ${url} timed out after ${timeoutMs}ms`,
    timeoutMs === undefined ? {} : { timeoutMs }
  );

export const atlasHttpError = (
  url: string,
  statusCode: number,
  body: string
): AtlasApiError =>
  new AtlasApiError(
    "http",
    `Atlas API error ${statusCode} for ${url}: ${body.slice(0, HTTP_BODY_PREVIEW)}`,
    { body, statusCode }
  );

export const atlasMalformedResponseError = (
  url: string,
  contentType: string | null,
  body: string
): AtlasApiError =>
  new AtlasApiError(
    "malformed",
    `Atlas API returned non-JSON response for ${url} (${contentType ?? "unknown content-type"}): ${body.slice(0, NON_JSON_PREVIEW)}`,
    { body, contentType }
  );
