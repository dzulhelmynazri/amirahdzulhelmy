import type { AtlasClient } from "../client";

export interface BaggageRequest {
  sessionId: string;
  routingIdentifier: string;
}

export type BaggageResponse = Record<string, unknown>;

export const createBaggage = (client: AtlasClient) => ({
  get(input: BaggageRequest): Promise<BaggageResponse> {
    return client.post<BaggageResponse>("/baggage.do", input);
  },
});
