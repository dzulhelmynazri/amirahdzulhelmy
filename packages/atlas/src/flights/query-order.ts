import type { AtlasClient } from "../client";

export interface QueryOrderRequest {
  orderNo: string;
  [key: string]: unknown;
}

export interface QueryOrderResponse {
  status: number;
  msg: string | null;
  [key: string]: unknown;
}

export const createQueryOrder = (client: AtlasClient) => ({
  query(input: QueryOrderRequest): Promise<QueryOrderResponse> {
    return client.post<QueryOrderResponse>("/orderQuery.do", input);
  },
});
