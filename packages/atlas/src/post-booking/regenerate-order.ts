import type { AtlasClient } from "../client";

export type RegenerateOrderRequest = Record<string, unknown>;

export interface RegenerateOrderResponse {
  status: number;
  msg: string | null;
  [key: string]: unknown;
}

export const createRegenerateOrder = (client: AtlasClient) => ({
  regenerate(input: RegenerateOrderRequest): Promise<RegenerateOrderResponse> {
    return client.post<RegenerateOrderResponse>("/regenerateOrder.do", input);
  },
});
