import type { AtlasClient } from "../client";

export interface ConfirmOrderRequest {
  orderNo: string;
  redirectUri?: string | null;
  iframe?: boolean;
  timeout?: number;
}

export interface ConfirmOrderResponse {
  status: number;
  msg: string | null;
  confirmationUrl: string;
}

export const createConfirmOrder = (client: AtlasClient) => ({
  confirm(input: ConfirmOrderRequest): Promise<ConfirmOrderResponse> {
    return client.post<ConfirmOrderResponse>("/orderCommit.do", input);
  },
});
