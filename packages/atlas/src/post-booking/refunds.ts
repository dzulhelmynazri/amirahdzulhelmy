import type { AtlasClient } from "../client";

export type RefundRequest = Record<string, unknown>;

export interface RefundResponse {
  status: number;
  msg: string | null;
  [key: string]: unknown;
}

export const createRefunds = (client: AtlasClient) => ({
  create(input: RefundRequest): Promise<RefundResponse> {
    return client.post<RefundResponse>("/refund.do", input);
  },
});
