import type { AtlasClient } from "../client";

export interface CreateOrderRequest {
  sessionId: string;
  routingIdentifier: string;
  [key: string]: unknown;
}

export type CreateOrderResponse = Record<string, unknown>;

export const createOrder = (client: AtlasClient) => ({
  create(input: CreateOrderRequest): Promise<CreateOrderResponse> {
    return client.post<CreateOrderResponse>("/order.do", input);
  },
});
