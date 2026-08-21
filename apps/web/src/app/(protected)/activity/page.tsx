import { ActivityMap } from "@/components/activity/activity-map";
import { ActivityStats } from "@/components/activity/activity-stats";
import { ActivityTable } from "@/components/activity/activity-table";
import { CategoryChart } from "@/components/activity/category-chart";
import { SentinelStatus } from "@/components/activity/sentinel-status";

export default function ActivityPage() {
  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <ActivityStats />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid content-start gap-4 lg:col-span-2">
          <ActivityMap />
          <SentinelStatus />
        </div>
        <CategoryChart />
      </div>
      <ActivityTable />
    </div>
  );
}
