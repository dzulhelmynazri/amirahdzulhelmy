import type {
  ActivityAlert,
  ActivityAlertRow,
  AlertCategory,
  AlertSeverity,
  AlertStatus,
  DestinationMarker,
} from "@/types/activity";

export const sentinelSchedule = {
  intervalHours: 6,
  lastScanOffsetHours: 2,
};

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

export const severityRank: Record<AlertSeverity, number> = {
  critical: 3,
  high: 2,
  low: 0,
  medium: 1,
};

export const statusLabels: Record<AlertStatus, string> = {
  active: "Active",
  resolved: "Resolved",
  superseded: "Superseded",
};

const isAlertCategory = (value: string): value is AlertCategory =>
  Object.hasOwn(categoryLabels, value);

const isAlertSeverity = (value: string): value is AlertSeverity =>
  Object.hasOwn(severityLabels, value);

const isAlertStatus = (value: string): value is AlertStatus =>
  Object.hasOwn(statusLabels, value);

export const toActivityAlerts = (
  rows: readonly ActivityAlertRow[]
): ActivityAlert[] =>
  rows.flatMap((row) => {
    if (
      !(
        isAlertCategory(row.category) &&
        isAlertSeverity(row.severity) &&
        isAlertStatus(row.status)
      )
    ) {
      return [];
    }
    return [
      {
        category: row.category,
        countryCode: row.countryCode,
        destination: row.destination,
        detectedAt: row.detectedAt,
        id: row.id,
        latitude: row.latitude,
        longitude: row.longitude,
        severity: row.severity,
        source: row.source,
        status: row.status,
        summary: row.summary,
      },
    ];
  });

export const sourceHostname = (source: string): string => {
  try {
    return new URL(source).hostname;
  } catch {
    return source;
  }
};

export const destinationMarkers = (
  alerts: readonly ActivityAlert[]
): DestinationMarker[] => {
  const byDestination = new Map<string, DestinationMarker>();
  for (const alert of alerts) {
    const existing = byDestination.get(alert.destination);
    if (!existing) {
      byDestination.set(alert.destination, {
        activeCount: alert.status === "active" ? 1 : 0,
        alertCount: 1,
        countryCode: alert.countryCode,
        destination: alert.destination,
        firstSeenAt: alert.detectedAt,
        latitude: alert.latitude,
        longitude: alert.longitude,
        worstSeverity: alert.severity,
      });
      continue;
    }
    existing.alertCount += 1;
    if (alert.status === "active") {
      existing.activeCount += 1;
    }
    if (alert.detectedAt < existing.firstSeenAt) {
      existing.firstSeenAt = alert.detectedAt;
    }
    if (severityRank[alert.severity] > severityRank[existing.worstSeverity]) {
      existing.worstSeverity = alert.severity;
    }
  }
  return [...byDestination.values()];
};
