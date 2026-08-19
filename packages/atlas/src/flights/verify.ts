import type { AtlasClient } from "../client";

export interface VerifyRequest {
  routingIdentifier: string;
  [key: string]: unknown;
}

export interface VerifyResponse {
  status: number;
  msg: string | null;
  sessionId?: string;
  [key: string]: unknown;
}

export const createFlightVerify = (client: AtlasClient) => ({
  verify(input: VerifyRequest): Promise<VerifyResponse> {
    return client.post<VerifyResponse>("/verify.do", input);
  },
});
