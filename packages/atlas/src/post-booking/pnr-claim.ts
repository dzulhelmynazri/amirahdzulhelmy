import type { AtlasClient } from "../client";

export type PnrClaimRequest = Record<string, unknown>;

export interface PnrClaimResponse {
  status: number;
  msg: string | null;
  [key: string]: unknown;
}

export const createPnrClaim = (client: AtlasClient) => ({
  claim(input: PnrClaimRequest): Promise<PnrClaimResponse> {
    return client.post<PnrClaimResponse>("/pnrClaim.do", input);
  },
});
