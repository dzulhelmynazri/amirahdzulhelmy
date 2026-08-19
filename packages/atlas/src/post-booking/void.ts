import type { AtlasClient } from "../client";

export type VoidRequest = Record<string, unknown>;

export interface VoidResponse {
  status: number;
  msg: string | null;
  [key: string]: unknown;
}

export const createVoid = (client: AtlasClient) => ({
  create(input: VoidRequest): Promise<VoidResponse> {
    return client.post<VoidResponse>("/void.do", input);
  },
});
