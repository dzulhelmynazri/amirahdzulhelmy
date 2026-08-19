import type { AtlasClient } from "../client";
import { toAtlasSearchBody } from "./atlas-search-body";

export interface SearchRequest {
  tripType: string;
  adultNum: number;
  childNum: number;
  infantNum: number;

  fromCity: string;
  fromAirport?: string;

  toCity: string;
  toAirport?: string;

  fromDate: string;
  retDate?: string;

  airlines?: string[];
  fromFlightNumbers?: string[];
  retFlightNumbers?: string[];

  includeMultipleFareFamily?: boolean;

  currency?: string | null;
  displayCurrency?: string;

  requestSource?: string | null;
}

export interface SearchResponse {
  status: number;
  msg: string | null;
  routings: unknown[];
}

export const createFlightSearch = (client: AtlasClient) => ({
  search(input: SearchRequest): Promise<SearchResponse> {
    return client.post<SearchResponse>(
      "/search.do",
      toAtlasSearchBody({ ...input })
    );
  },
});
