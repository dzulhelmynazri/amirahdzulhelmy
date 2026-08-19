import type { AtlasClient } from "../client";
import { toAtlasSearchBody } from "./atlas-search-body";

export type SmartSearchRequest = Record<string, unknown>;

export interface SmartSearchResponse {
  status: number;
  msg: string | null;
  [key: string]: unknown;
}

export const createSmartSearch = (client: AtlasClient) => ({
  search(input: SmartSearchRequest): Promise<SmartSearchResponse> {
    return client.post<SmartSearchResponse>(
      "/smartSearch.do",
      toAtlasSearchBody(input)
    );
  },
});
