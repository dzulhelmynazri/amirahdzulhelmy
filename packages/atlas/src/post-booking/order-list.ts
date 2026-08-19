import type { AtlasClient } from "../client";

export type OrderListRequest = Record<string, unknown>;

export interface OrderListResponse {
  status: number;
  msg: string | null;
  [key: string]: unknown;
}

export const createOrderList = (client: AtlasClient) => ({
  list(input: OrderListRequest): Promise<OrderListResponse> {
    return client.post<OrderListResponse>("/orderList.do", input);
  },
});
