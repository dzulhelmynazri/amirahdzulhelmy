"use client";

import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";

import { CategoryChart } from "./category-chart";
import { toActivityAlerts } from "./data";
import { ActivityTable } from "./data-table";
import { DisruptionsCard } from "./disruptions-card";
import { ActivityMap } from "./map";
import { SentinelMonitorCard } from "./sentinel-monitor-card";
import { TrendingNews } from "./trending-news";

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
  const { data } = useQuery(trpc.activity.list.queryOptions());
  const alerts = toActivityAlerts(data?.alerts ?? []);
  const watching = data?.watching ?? [];

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      {/*
        An empty board has two very different causes and they used to look
        identical. "Nothing is wrong anywhere you are going" is reassuring;
        "you have no trips, so nothing here could be about you" is an
        explanation. Saying which one it is costs a line.
      */}
      {data && watching.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No trips departing in the next {data.horizonDays} days, so there is
          nothing here yet. Alerts appear once you have a booking — this board
          only carries places you are actually going. World news is below.
        </p>
      ) : null}

      <ActivityMap alerts={alerts} />
      {/*
        Side by side under the globe rather than stacked in a third-width
        column beside it. At full width both have room, and they collapse to
        one column before either gets narrow enough to cramp.
      */}
      {/*
        Above the destination board on purpose: a change to a flight you have
        already paid for outranks news about a place you are going to.
      */}
      <DisruptionsCard />
      <div className="grid gap-4 lg:grid-cols-2">
        <SentinelMonitorCard />
        <CategoryChart alerts={alerts} />
      </div>
      <ActivityTable alerts={alerts} />
      {/*
        Below the table, and last. World news is context, not something the
        traveller has to act on — putting it above the alerts that concern
        their own trips would invert what this page is for.
      */}
      <TrendingNews />
    </div>
  );
};
