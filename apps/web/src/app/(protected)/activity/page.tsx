import { ActivityMap } from "@/components/activity/activity-map";
import { ActivityTable } from "@/components/activity/activity-table";
import { CategoryChart } from "@/components/activity/category-chart";

export default function ActivityPage() {
  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActivityMap />
        </div>
        <CategoryChart />
      </div>
      <ActivityTable />
    </div>
  );
}
