import type { AtlasClient } from "../client";

export interface PaymentAndTicketingRequest {
  orderNo: string;
  [key: string]: unknown;
}

export interface PaymentAndTicketingResponse {
  status: number;
  msg: string | null;
  [key: string]: unknown;
}

export const createPaymentAndTicketing = (client: AtlasClient) => ({
  pay(input: PaymentAndTicketingRequest): Promise<PaymentAndTicketingResponse> {
    return client.post<PaymentAndTicketingResponse>("/pay.do", input);
  },
});
