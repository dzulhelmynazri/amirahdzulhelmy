export type AlertCategory =
  | "health"
  | "political"
  | "safety"
  | "transit"
  | "weather";

export type AlertSeverity = "critical" | "high" | "low" | "medium";

export type AlertStatus = "active" | "resolved" | "superseded";

export type AlertAction =
  | "disruption-guard"
  | "journey-concierge"
  | "none"
  | "rebook-agent";

export interface ActivityAlert {
  id: string;
  category: AlertCategory;
  countryCode: string;
  severity: AlertSeverity;
  destination: string;
  summary: string;
  trip: string;
  action: AlertAction;
  source: string;
  detectedAt: string;
  status: AlertStatus;
}

export const categoryLabels: Record<AlertCategory, string> = {
  health: "Health",
  political: "Political",
  safety: "Safety",
  transit: "Transit",
  weather: "Weather",
};

export const severityLabels: Record<AlertSeverity, string> = {
  critical: "Critical",
  high: "High",
  low: "Low",
  medium: "Medium",
};

export const statusLabels: Record<AlertStatus, string> = {
  active: "Active",
  resolved: "Resolved",
  superseded: "Superseded",
};

export const actionLabels: Record<AlertAction, string> = {
  "disruption-guard": "Delegated to disruption-guard",
  "journey-concierge": "Delegated to journey-concierge",
  none: "Monitoring only",
  "rebook-agent": "Delegated to rebook-agent",
};

export const mockAlerts: ActivityAlert[] = [
  {
    action: "disruption-guard",
    category: "weather",
    countryCode: "JP",
    destination: "Osaka, Japan",
    detectedAt: "2026-08-20T22:15:00Z",
    id: "alert-001",
    severity: "critical",
    source: "https://www.jma.go.jp/bosai/warning/",
    status: "active",
    summary:
      "Typhoon Ampil approaching Kansai region with landfall expected within 48 hours. Rail suspensions and flight cancellations likely.",
    trip: "KUL → KIX · ATL-88213",
  },
  {
    action: "journey-concierge",
    category: "transit",
    countryCode: "FR",
    destination: "Paris, France",
    detectedAt: "2026-08-20T09:40:00Z",
    id: "alert-002",
    severity: "high",
    source: "https://www.ratp.fr/en/traffic-info",
    status: "active",
    summary:
      "Metro union strike announced for 25–27 August. RER B service to CDG airport expected to run at reduced frequency.",
    trip: "KUL → CDG · ATL-87954",
  },
  {
    action: "none",
    category: "safety",
    countryCode: "TH",
    destination: "Bangkok, Thailand",
    detectedAt: "2026-08-19T14:05:00Z",
    id: "alert-003",
    severity: "medium",
    source:
      "https://travel.state.gov/en/international-travel/travel-advisories.html",
    status: "active",
    summary:
      "Pickpocket hotspots reported around Khao San Road during festival week. Standard precautions advised.",
    trip: "KUL → BKK · ATL-87710",
  },
  {
    action: "none",
    category: "health",
    countryCode: "ID",
    destination: "Bali, Indonesia",
    detectedAt: "2026-08-18T08:30:00Z",
    id: "alert-004",
    severity: "medium",
    source: "https://www.who.int/emergencies/disease-outbreak-news",
    status: "active",
    summary:
      "Dengue cases rising in Denpasar area. Health authority recommends repellent use and eliminating standing water.",
    trip: "KUL → DPS · ATL-87688",
  },
  {
    action: "journey-concierge",
    category: "political",
    countryCode: "TH",
    destination: "Bangkok, Thailand",
    detectedAt: "2026-08-17T11:20:00Z",
    id: "alert-005",
    severity: "high",
    source: "https://www.reuters.com/world/asia-pacific/",
    status: "superseded",
    summary:
      "Planned demonstrations near government district on 24 August. Avoid protest areas; expect road closures.",
    trip: "KUL → BKK · ATL-87710",
  },
  {
    action: "none",
    category: "weather",
    countryCode: "CH",
    destination: "Zurich, Switzerland",
    detectedAt: "2026-08-16T16:45:00Z",
    id: "alert-006",
    severity: "low",
    source: "https://www.meteoswiss.admin.ch/",
    status: "resolved",
    summary:
      "Heat advisory extended through the weekend. Temperatures expected near 36°C in lowland areas.",
    trip: "KUL → ZRH · ATL-87401",
  },
  {
    action: "rebook-agent",
    category: "transit",
    countryCode: "JP",
    destination: "Osaka, Japan",
    detectedAt: "2026-08-21T03:10:00Z",
    id: "alert-007",
    severity: "critical",
    source: "https://www.kansai-airport.com/en/news",
    status: "active",
    summary:
      "KIX airport confirmed 34 cancellations ahead of typhoon landfall. Rebooking window opened for affected routes.",
    trip: "KUL → KIX · ATL-88213",
  },
  {
    action: "none",
    category: "safety",
    countryCode: "CH",
    destination: "Zurich, Switzerland",
    detectedAt: "2026-08-15T10:00:00Z",
    id: "alert-008",
    severity: "low",
    source: "https://www.eda.admin.ch/travel-advice",
    status: "resolved",
    summary:
      "No current advisories found for Zurich. Routine monitoring continues.",
    trip: "KUL → ZRH · ATL-87401",
  },
];
