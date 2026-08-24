export type AlertCategory =
  | "health"
  | "political"
  | "safety"
  | "transit"
  | "weather";

export type AlertSeverity = "critical" | "high" | "low" | "medium";

export type AlertStatus = "active" | "resolved" | "superseded";

export interface ActivityAlert {
  id: string;
  category: AlertCategory;
  countryCode: string;
  severity: AlertSeverity;
  destination: string;
  latitude: number;
  longitude: number;
  summary: string;
  source: string;
  detectedAt: string;
  status: AlertStatus;
}

export interface ActivityAlertRow {
  category: string;
  countryCode: string;
  destination: string;
  detectedAt: string;
  id: string;
  latitude: number;
  longitude: number;
  severity: string;
  source: string;
  status: string;
  summary: string;
}

export interface DestinationMarker {
  activeCount: number;
  alertCount: number;
  countryCode: string;
  destination: string;
  firstSeenAt: string;
  latitude: number;
  longitude: number;
  worstSeverity: AlertSeverity;
}
