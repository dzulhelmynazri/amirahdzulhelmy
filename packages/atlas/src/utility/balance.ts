import type { AtlasClient } from "../client";

export type BalanceRequest = Record<string, unknown>;

export interface BalanceResponse {
  status: number;
  msg: string | null;
  [key: string]: unknown;
}

export const createBalance = (client: AtlasClient) => ({
  get(input: BalanceRequest): Promise<BalanceResponse> {
    return client.post<BalanceResponse>("/balance.do", input);
  },
});
