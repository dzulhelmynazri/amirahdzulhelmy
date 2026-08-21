"use client";

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@atlas/ui/components/card";
import { BellRing, Globe, MapPin, OctagonAlert } from "lucide-react";

import { mockAlerts } from "./activity-data";

const activeAlerts = mockAlerts.filter((alert) => alert.status === "active");

const stats = [
  {
    icon: BellRing,
    label: "Active alerts",
    value: activeAlerts.length,
  },
  {
    icon: OctagonAlert,
    label: "Critical",
    value: activeAlerts.filter((alert) => alert.severity === "critical").length,
  },
  {
    icon: MapPin,
    label: "Destinations monitored",
    value: new Set(mockAlerts.map((alert) => alert.destination)).size,
  },
  {
    icon: Globe,
    label: "Countries monitored",
    value: new Set(mockAlerts.map((alert) => alert.countryCode)).size,
  },
];

export const ActivityStats = () => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {stats.map((stat) => {
      const Icon = stat.icon;
      return (
        <Card key={stat.label}>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground line-clamp-1 truncate">
              {stat.label}
            </CardTitle>
            <CardAction>
              <Icon className="size-4 text-muted-foreground" />
            </CardAction>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {stat.value}
          </CardContent>
        </Card>
      );
    })}
  </div>
);
