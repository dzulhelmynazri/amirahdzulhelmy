import type { AtlasClient } from "../client";

export type PriceCompareSearchRequest = Record<string, unknown>;

export interface PriceCompareSearchResponse {
  status: number;
  msg: string | null;
  [key: string]: unknown;
}

export const createPriceCompareSearch = (client: AtlasClient) => ({
  search(
    input: PriceCompareSearchRequest
  ): Promise<PriceCompareSearchResponse> {
    return client.post<PriceCompareSearchResponse>(
      "/priceCompareSearch.do",
      input
    );
  },
});
