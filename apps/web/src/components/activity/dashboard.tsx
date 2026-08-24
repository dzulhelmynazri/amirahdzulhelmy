"use client";

import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";

import { toActivityAlerts } from "./activity-data";
import { ActivityMap } from "./activity-map";
import { ActivityTable } from "./activity-table";
import { CategoryChart } from "./category-chart";
import { SentinelMonitorCard } from "./sentinel-monitor-card";

export const ActivityDashboard = () => {
  const { data = [] } = useQuery(trpc.activity.list.queryOptions());
  const alerts = toActivityAlerts(data);

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-full lg:col-span-2">
          <ActivityMap alerts={alerts} />
        </div>
        <div className="flex h-full flex-col gap-4">
          <SentinelMonitorCard />
          <CategoryChart alerts={alerts} />
        </div>
      </div>
      <ActivityTable alerts={alerts} />
    </div>
  );
};
