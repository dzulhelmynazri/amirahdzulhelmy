import type { AtlasClient } from "../client";

/**
 * Halt issuance on an order that has been paid but not yet ticketed.
 *
 * `/stopTicket.do`, verified against the sandbox: it answers with JSON. The
 * path this repo used to carry, `/stopTicketIssuance.do`, answers with a
 * Tomcat 404 — it was never a real endpoint, only a plausible-looking one.
 */

export type StopTicketIssuanceRequest = Record<string, unknown>;

export interface StopTicketIssuanceResponse {
  status: number;
  msg: string | null;
  requestId?: string | null;
  clientRequestId?: string | null;
  [key: string]: unknown;
}

export const createStopTicketIssuance = (client: AtlasClient) => ({
  stop(input: StopTicketIssuanceRequest): Promise<StopTicketIssuanceResponse> {
    return client.post<StopTicketIssuanceResponse>("/stopTicket.do", input);
  },
});
