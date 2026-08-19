import type { AtlasClient } from "../client";

export type GetOfferPriceRequest = Record<string, unknown>;

export interface GetOfferPriceResponse {
  status: number;
  msg: string | null;
  [key: string]: unknown;
}

export const createGetOfferPrice = (client: AtlasClient) => ({
  get(input: GetOfferPriceRequest): Promise<GetOfferPriceResponse> {
    return client.post<GetOfferPriceResponse>("/getOfferPrice.do", input);
  },
});
