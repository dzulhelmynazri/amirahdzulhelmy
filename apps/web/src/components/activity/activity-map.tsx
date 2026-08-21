"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@atlas/ui/components/card";
import { cn } from "@atlas/ui/lib/utils";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import worldData from "world-atlas/countries-110m.json";

import { mockAlerts, severityLabels, severityRank } from "./activity-data";
import type { AlertSeverity } from "./activity-data";

const MAP_HEIGHT = 480;
const MAP_WIDTH = 960;

const topology = worldData as unknown as Topology<{
  countries: GeometryCollection;
}>;
const countries = feature(topology, topology.objects.countries);
const projection = geoNaturalEarth1().fitExtent(
  [
    [0, 0],
    [MAP_WIDTH, MAP_HEIGHT],
  ],
  countries
);
const landPath = geoPath(projection)(countries) ?? "";

const markerClasses: Record<AlertSeverity, string> = {
  critical: "fill-destructive",
  high: "fill-destructive/70",
  low: "fill-muted-foreground",
  medium: "fill-primary",
};

const legendClasses: Record<AlertSeverity, string> = {
  critical: "bg-destructive",
  high: "bg-destructive/70",
  low: "bg-muted-foreground",
  medium: "bg-primary",
};

interface DestinationMarker {
  activeCount: number;
  alertCount: number;
  destination: string;
  latitude: number;
  longitude: number;
  worstSeverity: AlertSeverity;
}

const markers: DestinationMarker[] = (() => {
  const byDestination = new Map<string, DestinationMarker>();
  for (const alert of mockAlerts) {
    const existing = byDestination.get(alert.destination);
    if (!existing) {
      byDestination.set(alert.destination, {
        activeCount: alert.status === "active" ? 1 : 0,
        alertCount: 1,
        destination: alert.destination,
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
    if (severityRank[alert.severity] > severityRank[existing.worstSeverity]) {
      existing.worstSeverity = alert.severity;
    }
  }
  return [...byDestination.values()];
})();

export const ActivityMap = () => (
  <Card>
    <CardHeader>
      <CardTitle>Global alert map</CardTitle>
      <CardDescription>
        What travel-sentinel is watching around the world right now.
      </CardDescription>
    </CardHeader>
    <CardContent className="flex flex-col gap-3">
      <svg
        aria-label="World map showing monitored destinations colored by worst alert severity"
        className="w-full"
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      >
        <path
          className="fill-muted stroke-border"
          d={landPath}
          strokeWidth={0.5}
        />
        {markers.map((marker) => {
          const point = projection([marker.longitude, marker.latitude]);
          if (!point) {
            return null;
          }
          const [x, y] = point;
          return (
            <g key={marker.destination}>
              {marker.worstSeverity === "critical" && marker.activeCount > 0 ? (
                <circle className="fill-destructive/20" cx={x} cy={y} r={10} />
              ) : null}
              <circle
                className={cn(
                  "stroke-background",
                  markerClasses[marker.worstSeverity]
                )}
                cx={x}
                cy={y}
                r={4}
                strokeWidth={1}
              >
                <title>{`${marker.destination} — ${marker.alertCount} alerts, ${marker.activeCount} active`}</title>
              </circle>
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {(["critical", "high", "medium", "low"] as const).map((severity) => (
          <span key={severity} className="inline-flex items-center gap-1.5">
            <span
              className={cn("size-2 rounded-full", legendClasses[severity])}
            />
            {severityLabels[severity]}
          </span>
        ))}
      </div>
    </CardContent>
  </Card>
);
