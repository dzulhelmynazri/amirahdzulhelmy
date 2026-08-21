"use client";

import { Badge } from "@atlas/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@atlas/ui/components/card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@atlas/ui/components/hover-card";
import { cn } from "@atlas/ui/lib/utils";
import { geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import type { MultiLineString } from "geojson";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import worldData from "world-atlas/countries-110m.json";

import {
  categoryLabels,
  mockAlerts,
  severityLabels,
  severityRank,
  statusLabels,
} from "./activity-data";
import type { AlertSeverity } from "./activity-data";

const GLOBE_HEIGHT = 480;
const GLOBE_WIDTH = 640;
const GLOBE_PADDING = 8;
const AUTO_ROTATE_DEG_PER_SEC = 4;
const MAX_TILT_DEG = 80;
const LIMB_COSINE = 0.15;
const MAX_DETAIL_ALERTS = 2;
const KEY_ROTATE_STEP_DEG = 8;
const DEGREES = Math.PI / 180;

const topology = worldData as unknown as Topology<{
  countries: GeometryCollection;
}>;
const countries = feature(topology, topology.objects.countries);

const legendClasses: Record<AlertSeverity, string> = {
  critical: "bg-destructive",
  high: "bg-destructive/70",
  low: "bg-muted-foreground",
  medium: "bg-primary",
};

interface DestinationMarker {
  activeCount: number;
  alertCount: number;
  countryCode: string;
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
  const [openDestination, setOpenDestination] = useState<string | null>(null);
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

  const visibleMarkers = markers.flatMap((marker) => {
    if (!isVisible(marker.longitude, marker.latitude)) {
      return [];
    }
    const point = projection([marker.longitude, marker.latitude]);
    if (!point) {
      return [];
    }
    const [x, y] = point;
    return [{ marker, x, y }];
  });

  const openMarker =
    visibleMarkers.find(
      (visible) => visible.marker.destination === openDestination
    ) ?? null;
  const cardOpen = openMarker !== null;

  useEffect(() => {
    if (reducedMotion) {
      return;
    }
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const deltaSeconds = (now - last) / 1000;
      last = now;
      if (!dragging && !hovering && !cardOpen) {
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
  }, [cardOpen, dragging, hovering, reducedMotion]);

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
          What travel-sentinel is watching around the world right now. Click a
          destination for details; drag or use arrow keys to rotate.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="relative mx-auto w-full max-w-2xl">
          <button
            aria-label="Rotatable globe. Use arrow keys to rotate."
            type="button"
            className={cn(
              "block w-full cursor-grab touch-none rounded-full outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
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
            </svg>
          </button>
          {visibleMarkers.map(({ marker, x, y }) => {
            const alerts = mockAlerts
              .filter((alert) => alert.destination === marker.destination)
              .toSorted(
                (a, b) => severityRank[b.severity] - severityRank[a.severity]
              );
            const shownAlerts = alerts.slice(0, MAX_DETAIL_ALERTS);
            const hiddenAlertCount = alerts.length - shownAlerts.length;
            return (
              <HoverCard
                key={marker.destination}
                open={openMarker?.marker.destination === marker.destination}
                onOpenChange={(open) =>
                  setOpenDestination(open ? marker.destination : null)
                }
              >
                <HoverCardTrigger
                  aria-label={`${marker.destination}: ${marker.alertCount} alerts, ${marker.activeCount} active`}
                  className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  style={{
                    left: `${(x / GLOBE_WIDTH) * 100}%`,
                    top: `${(y / GLOBE_HEIGHT) * 100}%`,
                  }}
                  onPointerEnter={() => setHovering(true)}
                  onPointerLeave={() => setHovering(false)}
                >
                  {marker.worstSeverity === "critical" &&
                  marker.activeCount > 0 ? (
                    <span
                      className={cn(
                        "absolute inset-0 rounded-full bg-destructive/20",
                        !reducedMotion && "animate-ping"
                      )}
                    />
                  ) : null}
                  <span
                    className={cn(
                      "absolute inset-1 rounded-full border border-background",
                      legendClasses[marker.worstSeverity]
                    )}
                  />
                </HoverCardTrigger>
                <HoverCardContent className="w-72" side="top">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 font-medium">
                        <Image
                          alt="Flags"
                          className="rounded-[2px] ring-1 ring-foreground/10"
                          height={15}
                          loading="lazy"
                          src={`https://flagcdn.com/w40/${marker.countryCode.toLowerCase()}.png`}
                          width={20}
                        />
                        {marker.destination}
                      </p>
                      <Badge variant="secondary">
                        {marker.activeCount} active
                      </Badge>
                    </div>
                    <ul className="flex flex-col gap-2">
                      {shownAlerts.map((alert) => (
                        <li
                          key={alert.id}
                          className="flex flex-col gap-1 rounded-md bg-muted/60 p-2"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className={cn(
                                  "size-2 rounded-full",
                                  legendClasses[alert.severity]
                                )}
                              />
                              {categoryLabels[alert.category]}
                            </span>
                            <span>{statusLabels[alert.status]}</span>
                          </div>
                          <p className="line-clamp-2 text-xs">
                            {alert.summary}
                          </p>
                          <Link
                            className="w-fit text-xs text-primary underline-offset-2 hover:underline"
                            href={alert.source}
                            rel="noopener"
                            target="_blank"
                          >
                            {new URL(alert.source).hostname}
                          </Link>
                        </li>
                      ))}
                      {hiddenAlertCount > 0 ? (
                        <li className="text-xs text-muted-foreground">
                          +{hiddenAlertCount} more in the alerts table
                        </li>
                      ) : null}
                    </ul>
                  </div>
                </HoverCardContent>
              </HoverCard>
            );
          })}
        </div>
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
