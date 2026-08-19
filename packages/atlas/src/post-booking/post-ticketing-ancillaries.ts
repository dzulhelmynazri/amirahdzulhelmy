import type { AtlasClient } from "../client";

export type PostTicketingAncillariesRequest = Record<string, unknown>;

export interface PostTicketingAncillariesResponse {
  status: number;
  msg: string | null;
  [key: string]: unknown;
}

export const createPostTicketingAncillaries = (client: AtlasClient) => ({
  get(
    input: PostTicketingAncillariesRequest
  ): Promise<PostTicketingAncillariesResponse> {
    return client.post<PostTicketingAncillariesResponse>(
      "/post-ticketing/ancillaries.do",
      input
    );
  },
});
