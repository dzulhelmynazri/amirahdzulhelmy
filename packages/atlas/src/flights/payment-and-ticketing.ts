import type { AtlasClient } from "../client";

export interface PaymentAndTicketingRequest {
  orderNo: string;
  /** 1 = deposit balance, 3 = VCC passthrough, 4 = BYOA, 5 = MoR. Required by /pay.do. */
  paymentMethod: number;
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
