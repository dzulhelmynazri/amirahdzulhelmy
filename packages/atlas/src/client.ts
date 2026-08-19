export interface AtlasClientConfig {
  apiUrl: string;
  clientId: string;
  clientSecret: string;
}

export class AtlasClient {
  public readonly config: AtlasClientConfig;

  constructor(config: AtlasClientConfig) {
    this.config = config;
  }

  private headers() {
    return {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate, br",
      "Content-Type": "application/json",
      "x-atlas-client-id": this.config.clientId,
      "x-atlas-client-secret": this.config.clientSecret,
    };
  }

  private requestUrl(path: string): string {
    const origin = this.config.apiUrl.endsWith("/")
      ? this.config.apiUrl.slice(0, -1)
      : this.config.apiUrl;
    const suffix = path.startsWith("/") ? path : `/${path}`;
    return `${origin}${suffix}`;
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const url = this.requestUrl(path);
    const response = await fetch(url, {
      body: JSON.stringify(body),
      headers: this.headers(),
      method: "POST",
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(
        `Atlas API error ${response.status} for ${url}: ${text.slice(0, 500)}`
      );
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(
        `Atlas API returned non-JSON response for ${url} (${response.headers.get("content-type") ?? "unknown content-type"}): ${text.slice(0, 200)}`
      );
    }
  }
}
