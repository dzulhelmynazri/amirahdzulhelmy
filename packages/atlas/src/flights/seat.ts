import type { AtlasClient } from "../client";

export interface SeatAndBaggageRequest {
  sessionId: string;
  routingIdentifier: string;
}

export type SeatAndBaggageResponse = Record<string, unknown>;

export const createSeatAndBaggage = (client: AtlasClient) => ({
  get(input: SeatAndBaggageRequest): Promise<SeatAndBaggageResponse> {
    return client.post("/inflow/seat-and-baggage", input);
  },
});
