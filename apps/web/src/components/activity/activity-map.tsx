"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@atlas/ui/components/card";
import { cn } from "@atlas/ui/lib/utils";
import { geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import type { MultiLineString } from "geojson";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import worldData from "world-atlas/countries-110m.json";

import { mockAlerts, severityLabels, severityRank } from "./activity-data";
import type { AlertSeverity } from "./activity-data";

const GLOBE_HEIGHT = 480;
const GLOBE_WIDTH = 640;
const GLOBE_PADDING = 8;
const AUTO_ROTATE_DEG_PER_SEC = 4;
const MAX_TILT_DEG = 80;
const LIMB_COSINE = 0.15;
const KEY_ROTATE_STEP_DEG = 8;
const DEGREES = Math.PI / 180;

const topology = worldData as unknown as Topology<{
  countries: GeometryCollection;
}>;
const countries = feature(topology, topology.objects.countries);

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
  firstSeenAt: string;
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
})();

const routeArcs: MultiLineString = (() => {
  const ordered = markers.toSorted((a, b) =>
    a.firstSeenAt.localeCompare(b.firstSeenAt)
  );
  const coordinates: [number, number][][] = [];
  let previous: DestinationMarker | null = null;
  for (const marker of ordered) {
    if (previous) {
      coordinates.push([
        [previous.longitude, previous.latitude],
        [marker.longitude, marker.latitude],
      ]);
    }
    previous = marker;
  }
  return { coordinates, type: "MultiLineString" };
})();

const subscribeToReducedMotion = (onChange: () => void) => {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

const getReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const usePrefersReducedMotion = () =>
  useSyncExternalStore(subscribeToReducedMotion, getReducedMotion, () => false);

const clampTilt = (phi: number) =>
  Math.max(-MAX_TILT_DEG, Math.min(MAX_TILT_DEG, phi));

export const ActivityMap = () => {
  const [rotation, setRotation] = useState<[number, number]>([-80, -20]);
  const [dragging, setDragging] = useState(false);
  const [hovering, setHovering] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const lastPointer = useRef<{ x: number; y: number } | null>(null);

  const projection = geoOrthographic()
    .fitExtent(
      [
        [GLOBE_PADDING, GLOBE_PADDING],
        [GLOBE_WIDTH - GLOBE_PADDING, GLOBE_HEIGHT - GLOBE_PADDING],
      ],
      { type: "Sphere" }
    )
    .rotate(rotation);
  const path = geoPath(projection);
  const degreesPerPixel = 90 / projection.scale();

  const rotateBy = (dLambda: number, dPhi: number) =>
    setRotation(
      ([lambda, phi]) =>
        [lambda + dLambda, clampTilt(phi + dPhi)] as [number, number]
    );

  useEffect(() => {
    if (reducedMotion) {
      return;
    }
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const deltaSeconds = (now - last) / 1000;
      last = now;
      if (!dragging && !hovering) {
        setRotation(
          ([lambda, phi]) =>
            [lambda - AUTO_ROTATE_DEG_PER_SEC * deltaSeconds, phi] as [
              number,
              number,
            ]
        );
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [dragging, hovering, reducedMotion]);

  const isVisible = (longitude: number, latitude: number) => {
    const [lambda, phi] = rotation;
    return (
      Math.sin(-phi * DEGREES) * Math.sin(latitude * DEGREES) +
        Math.cos(-phi * DEGREES) *
          Math.cos(latitude * DEGREES) *
          Math.cos((longitude + lambda) * DEGREES) >
      LIMB_COSINE
    );
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    lastPointer.current = { x: event.clientX, y: event.clientY };
    setDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!lastPointer.current) {
      return;
    }
    const dx = event.clientX - lastPointer.current.x;
    const dy = event.clientY - lastPointer.current.y;
    lastPointer.current = { x: event.clientX, y: event.clientY };
    rotateBy(dx * degreesPerPixel, -dy * degreesPerPixel);
  };

  const endDrag = () => {
    lastPointer.current = null;
    setDragging(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowLeft") {
      rotateBy(KEY_ROTATE_STEP_DEG, 0);
    } else if (event.key === "ArrowRight") {
      rotateBy(-KEY_ROTATE_STEP_DEG, 0);
    } else if (event.key === "ArrowUp") {
      rotateBy(0, -KEY_ROTATE_STEP_DEG);
    } else if (event.key === "ArrowDown") {
      rotateBy(0, KEY_ROTATE_STEP_DEG);
    } else {
      return;
    }
    event.preventDefault();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Global alert map</CardTitle>
        <CardDescription>
          What travel-sentinel is watching around the world right now. Drag or
          use arrow keys to rotate.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <button
          aria-label="Rotatable globe showing monitored destinations colored by worst alert severity. Use arrow keys to rotate."
          type="button"
          className={cn(
            "mx-auto block w-full max-w-2xl cursor-grab touch-none rounded-full outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
            dragging && "cursor-grabbing"
          )}
          onKeyDown={handleKeyDown}
          onPointerCancel={endDrag}
          onPointerDown={handlePointerDown}
          onPointerEnter={() => setHovering(true)}
          onPointerLeave={() => setHovering(false)}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
        >
          <svg
            aria-hidden="true"
            className="w-full"
            viewBox={`0 0 ${GLOBE_WIDTH} ${GLOBE_HEIGHT}`}
          >
            <path
              className="fill-muted/40 stroke-border"
              d={path({ type: "Sphere" }) ?? ""}
              strokeWidth={1}
            />
            <path
              className="fill-none stroke-border/60"
              d={path(geoGraticule10()) ?? ""}
              strokeWidth={0.4}
            />
            <path
              className="fill-muted stroke-border"
              d={path(countries) ?? ""}
              strokeWidth={0.5}
            />
            <path
              className="fill-none stroke-primary/50"
              d={path(routeArcs) ?? ""}
              strokeDasharray="3 4"
              strokeWidth={1}
            />
            {markers.map((marker) => {
              if (!isVisible(marker.longitude, marker.latitude)) {
                return null;
              }
              const point = projection([marker.longitude, marker.latitude]);
              if (!point) {
                return null;
              }
              const [x, y] = point;
              return (
                <g key={marker.destination}>
                  {marker.worstSeverity === "critical" &&
                  marker.activeCount > 0 ? (
                    <circle
                      className={cn(
                        "fill-destructive/20",
                        !reducedMotion &&
                          "animate-ping origin-center [transform-box:fill-box]"
                      )}
                      cx={x}
                      cy={y}
                      r={9}
                    />
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
        </button>
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
};
