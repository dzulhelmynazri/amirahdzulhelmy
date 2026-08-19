import type { AtlasClient } from "../client";

export type AtripTokenRequest = Record<string, unknown>;

export interface AtripTokenResponse {
  status: number;
  msg: string | null;
  [key: string]: unknown;
}

export const createAtripToken = (client: AtlasClient) => ({
  get(input: AtripTokenRequest): Promise<AtripTokenResponse> {
    return client.post<AtripTokenResponse>("/atripToken.do", input);
  },
});
