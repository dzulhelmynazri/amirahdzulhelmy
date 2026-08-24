"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@atlas/ui/components/card";
import { ChartContainer } from "@atlas/ui/components/chart";
import type { ChartConfig } from "@atlas/ui/components/chart";
import { Pie, PieChart } from "recharts";

import { categoryLabels } from "./activity-data";
import type { ActivityAlert, AlertCategory } from "./activity-data";

const chartPalette = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const categories = Object.keys(categoryLabels) as AlertCategory[];

const chartConfig: ChartConfig = Object.fromEntries(
  categories.map((category, index) => [
    category,
    {
      color: chartPalette[index % chartPalette.length] ?? "var(--chart-1)",
      label: categoryLabels[category],
    },
  ])
);

const categorySummary = categories
  .map((category, index) => {
    const label = categoryLabels[category].toLowerCase();
    return index === 0
      ? `${label.charAt(0).toUpperCase()}${label.slice(1)}`
      : label;
  })
  .join(", ");

export const CategoryChart = ({ alerts }: { alerts: ActivityAlert[] }) => {
  const categoryData = categories.map((category, index) => ({
    category,
    color: chartPalette[index % chartPalette.length] ?? "var(--chart-1)",
    count: alerts.filter((alert) => alert.category === category).length,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alerts by category</CardTitle>
        <CardDescription>{categorySummary}.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ChartContainer config={chartConfig} className="mx-auto h-40 w-full">
          <PieChart>
            <Pie
              data={categoryData}
              dataKey="count"
              innerRadius={40}
              nameKey="category"
              outerRadius={65}
              paddingAngle={2}
            />
          </PieChart>
        </ChartContainer>
        <ul className="flex flex-col gap-2 text-sm">
          {categoryData.map((entry) => (
            <li
              key={entry.category}
              className="flex items-center justify-between"
            >
              <span className="inline-flex items-center gap-2">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                {categoryLabels[entry.category]}
              </span>
              <span className="text-muted-foreground">{entry.count}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
