import type { AtlasClient } from "./client";

export interface RegisterWebhookRequest {
  cid?: string;
  url: string;
}

export interface RegisterWebhookResponse {
  status: number;
  msg: string | null;
}

export interface IncidentListRequest {
  eventId?: string;
  orderNo?: string;
  eventType?: string;
  pnr?: string;
  paxName?: string;
  paxEmail?: string;
  airline?: string;
  eventStatus?: number[];
  eventTimeStart?: string;
  eventTimeEnd?: string;
  depTimeStart?: string;
  depTimeEnd?: string;
  updateTimeStart?: string;
  pageIndex?: number;
  pageSize: number;
}

export interface IncidentListResponse {
  records: {
    eventId: string;
    orderNo: string;
    subOrderNo?: string;
    eventType: string;
    eventStatus: number;
    eventTime?: string;
    extraInfo?: string;
    confirmedResult?: unknown;
    confirmedRemark?: string | null;
    clientCode?: string;
    createTime?: string;
    updateIme?: string;
    airline?: string;
    depTime?: string;
    confirmTime?: string | null;
    confirmUsr?: string | null;
    notified?: number;
    pnr?: string;
    paxName?: string;
    paxEmail?: string;
  }[];
  [key: string]: unknown;
}

export const createWebhook = (client: AtlasClient) => ({
  incidents(input: IncidentListRequest): Promise<IncidentListResponse> {
    return client.post<IncidentListResponse>("/event/getPageList.do", input);
  },

  register(input: RegisterWebhookRequest): Promise<RegisterWebhookResponse> {
    return client.post<RegisterWebhookResponse>("/updateWebhookURL.do", input);
  },
});
