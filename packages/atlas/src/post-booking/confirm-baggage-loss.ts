import type { AtlasClient } from "../client";

/**
 * Confirm a baggage price change on an order waiting for one.
 *
 * This file used to be called `stop-ticket-issuance-1` and post to
 * `/stopTicketIssuance.do`. Both were wrong. The name came from the slug of
 * the documentation page — Atlas publishes this operation at a URL ending
 * `stop-ticket-issuance-1` — and the path was invented to match the name.
 * `/stopTicketIssuance.do` returns a Tomcat 404: nothing was ever there.
 *
 * The real Stop Ticket Issuance is `/stopTicket.do`, in `stop-ticket-issuance.ts`.
 */

export type ConfirmBaggageLossRequest = Record<string, unknown>;

export interface ConfirmBaggageLossResponse {
  status: number;
  msg: string | null;
  requestId?: string | null;
  clientRequestId?: string | null;
  [key: string]: unknown;
}

export const createConfirmBaggageLoss = (client: AtlasClient) => ({
  confirm(
    input: ConfirmBaggageLossRequest
  ): Promise<ConfirmBaggageLossResponse> {
    return client.post<ConfirmBaggageLossResponse>(
      "/confirmBaggageLoss.do",
      input
    );
  },
});
