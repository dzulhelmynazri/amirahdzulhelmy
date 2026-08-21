"use client";

import { Badge } from "@atlas/ui/components/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@atlas/ui/components/card";

import { mockAlerts, sentinelSchedule } from "./activity-data";

export const SentinelStatus = () => {
  const nextScanIn =
    sentinelSchedule.intervalHours - sentinelSchedule.lastScanOffsetHours;
  const destinations = new Set(mockAlerts.map((alert) => alert.destination))
    .size;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-1">
          <CardTitle className="text-sm font-medium">
            Travel Sentinel Agent
          </CardTitle>
          <CardDescription>Always-on destination monitoring</CardDescription>
        </div>
        <CardAction>
          <span className="relative mt-1 flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-blue-400" />
          </span>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
        <p className="flex flex-wrap items-center gap-1.5">
          Monitoring
          <Badge variant="secondary">{destinations}</Badge>
          destinations · scans every
          <Badge variant="secondary">{sentinelSchedule.intervalHours}h</Badge>
        </p>
        <p className="flex flex-wrap items-center gap-1.5">
          Last scan
          <Badge variant="secondary">
            {sentinelSchedule.lastScanOffsetHours}h ago
          </Badge>
          · next in
          <Badge variant="secondary">{nextScanIn}h</Badge>
        </p>
      </CardContent>
    </Card>
  );
};
