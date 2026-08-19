import type { AtlasClient } from "../client";

export type ExtractPnrRequest = Record<string, unknown>;

export interface ExtractPnrResponse {
  status: number;
  msg: string | null;
  [key: string]: unknown;
}

export const createExtractPnr = (client: AtlasClient) => ({
  extract(input: ExtractPnrRequest): Promise<ExtractPnrResponse> {
    return client.post<ExtractPnrResponse>("/extractPnr.do", input);
  },
});
