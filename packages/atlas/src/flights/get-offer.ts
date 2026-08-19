import type { AtlasClient } from "../client";

export type GetOfferRequest = Record<string, unknown>;

export interface GetOfferResponse {
  status: number;
  msg: string | null;
  [key: string]: unknown;
}

export const createGetOffer = (client: AtlasClient) => ({
  get(input: GetOfferRequest): Promise<GetOfferResponse> {
    return client.post<GetOfferResponse>("/getOffer.do", input);
  },
});
