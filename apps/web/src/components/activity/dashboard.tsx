"use client";

import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";

import { CategoryChart } from "./category-chart";
import { toActivityAlerts } from "./data";
import { ActivityTable } from "./data-table";
import { ActivityMap } from "./map";
import { SentinelMonitorCard } from "./sentinel-monitor-card";

/**
 * The globe takes the full width and everything else sits under it.
 *
 * It used to share a three-column row with two stacked cards, which gave the
 * globe two thirds and the cards a column too narrow to hold a chart. Opening
 * the agent panel took another third of the window and the cards became a
 * ribbon. The globe is the thing worth looking at here and it scales with the
 * space, so the cards moved beneath it where they have width to spare.
 */
export const ActivityDashboard = () => {
  const { data = [] } = useQuery(trpc.activity.list.queryOptions());
  const alerts = toActivityAlerts(data);

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <ActivityMap alerts={alerts} />
      {/*
        Side by side under the globe rather than stacked in a third-width
        column beside it. At full width both have room, and they collapse to
        one column before either gets narrow enough to cramp.
      */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SentinelMonitorCard />
        <CategoryChart alerts={alerts} />
      </div>
      <ActivityTable alerts={alerts} />
    </div>
  );
};
