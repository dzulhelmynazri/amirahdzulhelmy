import type { AtlasClient } from "../client";

export type EmailQueryRequest = Record<string, unknown>;

export interface EmailQueryResponse {
  status: number;
  msg: string | null;
  [key: string]: unknown;
}

export const createEmailQuery = (client: AtlasClient) => ({
  query(input: EmailQueryRequest): Promise<EmailQueryResponse> {
    return client.post<EmailQueryResponse>("/emailQuery.do", input);
  },
});
