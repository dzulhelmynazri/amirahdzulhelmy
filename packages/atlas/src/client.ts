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
    const response = await fetch(this.requestUrl(path), {
      body: JSON.stringify(body),
      headers: this.headers(),
      method: "POST",
    });

    const data = (await response.json()) as T;

    if (!response.ok) {
      throw new Error(
        `Atlas API error ${response.status}: ${JSON.stringify(data)}`
      );
    }

    return data;
  }
}
