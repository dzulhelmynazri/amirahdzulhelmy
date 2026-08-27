"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
} from "@atlas/ui/components/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@atlas/ui/components/card";
import { Firecrawl, Qwen } from "@atlas/ui/components/socials";

import type { ActivityAlert, AlertCategory } from "@/types/activity";

import { categoryLabels } from "./data";

const chartPalette = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const categories = Object.keys(categoryLabels) as AlertCategory[];

const PERCENT = 100;

/**
 * The category split, as one bar rather than a donut.
 *
 * There are five categories and most days three of them are zero, so the donut
 * this replaces drew two slices and carried a legend that repeated every
 * number underneath it — the legend was the data and the ring was decoration.
 * It also sat in a third-width column, which left it tall, cramped, and
 * cramped again whenever the agent panel opened.
 *
 * A single proportion bar reads at a glance, keeps the comparison the donut
 * was for, and works at any width because the labels below it simply wrap.
 */
export const CategoryChart = ({ alerts }: { alerts: ActivityAlert[] }) => {
  const counts = categories.map((category, index) => ({
    category,
    color: chartPalette[index % chartPalette.length] ?? "var(--chart-1)",
    count: alerts.filter((alert) => alert.category === category).length,
  }));

  const total = counts.reduce((sum, entry) => sum + entry.count, 0);
  const present = counts.filter((entry) => entry.count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alerts by category</CardTitle>
        <CardDescription>
          {total === 0
            ? "Nothing recorded yet."
            : `${total} active ${total === 1 ? "alert" : "alerts"} across ${present.length} of ${categories.length} categories.`}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div
          aria-hidden
          className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-muted"
        >
          {present.map((entry) => (
            <span
              className="h-full first:rounded-l-full last:rounded-r-full"
              key={entry.category}
              style={{
                backgroundColor: entry.color,
                width: `${(entry.count / total) * PERCENT}%`,
              }}
            />
          ))}
        </div>

        {/*
          Wraps rather than stacks, so the same markup works beside the globe
          on a wide screen and underneath it on a narrow one.
        */}
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {counts.map((entry) => (
            <li className="inline-flex items-center gap-2" key={entry.category}>
              <span
                className="size-2 shrink-0 rounded-full"
                style={{
                  backgroundColor: entry.color,
                  // Zero categories keep their dot but lose their colour: the
                  // row still says the category exists without implying it has
                  // anything in it.
                  opacity: entry.count === 0 ? 0.25 : 1,
                }}
              />
              <span
                className={
                  entry.count === 0 ? "text-muted-foreground" : undefined
                }
              >
                {categoryLabels[entry.category]}
              </span>
              <span className="font-medium tabular-nums">{entry.count}</span>
            </li>
          ))}
        </ul>

        {/*
          Where these came from, as a footnote. It used to be a card of its own
          carrying one sentence and no data, directly above a chart that had
          nowhere to breathe.
        */}
        <div className="flex items-center gap-2 border-t pt-3 text-muted-foreground text-xs">
          <AvatarGroup>
            <Avatar size="sm">
              <AvatarFallback>
                <Firecrawl className="size-3" />
              </AvatarFallback>
            </Avatar>
            <Avatar size="sm">
              <AvatarFallback>
                <Qwen className="size-3" />
              </AvatarFallback>
            </Avatar>
          </AvatarGroup>
          Travel Sentinel scans every 6 hours and posts what it finds here.
        </div>
      </CardContent>
    </Card>
  );
};
