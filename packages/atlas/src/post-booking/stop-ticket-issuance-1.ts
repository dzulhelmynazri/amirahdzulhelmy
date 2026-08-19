import type { AtlasClient } from "../client";

export type StopTicketIssuanceRequest = Record<string, unknown>;

export interface StopTicketIssuanceResponse {
  status: number;
  msg: string | null;
  [key: string]: unknown;
}

export const createStopTicketIssuance1 = (client: AtlasClient) => ({
  stop(input: StopTicketIssuanceRequest): Promise<StopTicketIssuanceResponse> {
    return client.post<StopTicketIssuanceResponse>(
      "/stopTicketIssuance.do",
      input
    );
  },
});
