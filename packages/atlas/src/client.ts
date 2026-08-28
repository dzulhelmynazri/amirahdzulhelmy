import {
  atlasHttpError,
  atlasMalformedResponseError,
  atlasTimeoutError,
} from "./atlas-api-error";

export interface AtlasAuthHeaderNames {
  clientId: string;
  clientSecret: string;
}

export interface AtlasClientConfig {
  apiUrl: string;
  /**
   * Overrides the auth header names. The API reference documents
   * `x-atlas-client-id` / `x-atlas-client-secret`; some sandbox snippets use
   * `x-atlas-access-key` / `x-atlas-secret-key` instead.
   */
  authHeaderNames?: AtlasAuthHeaderNames;
  clientId: string;
  clientSecret: string;
}

export interface AtlasRequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
}

const DEFAULT_AUTH_HEADER_NAMES: AtlasAuthHeaderNames = {
  clientId: "x-atlas-client-id",
  clientSecret: "x-atlas-client-secret",
};

/**
 * Applied when the caller sets nothing, which for a while was every agent
 * tool: not one passed `timeoutMs`, so a hung Atlas call hung the tool — and
 * the session around it lives for seven days. Sixty seconds is generous for
 * an API whose slowest observed call is a wide smart-search; a caller that
 * genuinely needs longer can still say so.
 */
const DEFAULT_TIMEOUT_MS = 60_000;

const buildSignal = (
  options: AtlasRequestOptions | undefined
): AbortSignal | undefined => {
  const signals: AbortSignal[] = [];

  if (options?.signal) {
    signals.push(options.signal);
  }

  signals.push(AbortSignal.timeout(options?.timeoutMs ?? DEFAULT_TIMEOUT_MS));

  return signals.length === 1 ? signals[0] : AbortSignal.any(signals);
};

const isAbortLike = (error: unknown): boolean =>
  error instanceof Error &&
  (error.name === "TimeoutError" || error.name === "AbortError");

export class AtlasClient {
  public readonly config: AtlasClientConfig;

  constructor(config: AtlasClientConfig) {
    this.config = config;
  }

  private headers(extra?: Record<string, string>) {
    const names = this.config.authHeaderNames ?? DEFAULT_AUTH_HEADER_NAMES;

    return {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate, br",
      "Content-Type": "application/json",
      [names.clientId]: this.config.clientId,
      [names.clientSecret]: this.config.clientSecret,
      ...extra,
    };
  }

  private requestUrl(path: string): string {
    const origin = this.config.apiUrl.endsWith("/")
      ? this.config.apiUrl.slice(0, -1)
      : this.config.apiUrl;
    const suffix = path.startsWith("/") ? path : `/${path}`;
    return `${origin}${suffix}`;
  }

  async post<T>(
    path: string,
    body: unknown,
    options?: AtlasRequestOptions
  ): Promise<T> {
    const url = this.requestUrl(path);

    let response: Response;
    try {
      response = await fetch(url, {
        body: JSON.stringify(body),
        headers: this.headers(options?.headers),
        method: "POST",
        signal: buildSignal(options),
      });
    } catch (error) {
      if (isAbortLike(error)) {
        throw atlasTimeoutError(url, options?.timeoutMs);
      }
      throw error;
    }

    const text = await response.text();

    if (!response.ok) {
      throw atlasHttpError(url, response.status, text);
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw atlasMalformedResponseError(
        url,
        response.headers.get("content-type"),
        text
      );
    }
  }
}
