import type { AtlasClient } from "../client";

export type RouteExportRequest = Record<string, unknown>;

export interface RouteExportResponse {
  status: number;
  msg: string | null;
  [key: string]: unknown;
}

export const createRouteExport = (client: AtlasClient) => ({
  export(input: RouteExportRequest): Promise<RouteExportResponse> {
    return client.post<RouteExportResponse>("/route/export.do", {
      routeType: 2,
      ...input,
    });
  },
});
