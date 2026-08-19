import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@atlas/ui/components/empty";
import { PlaneTakeoff } from "lucide-react";
import { Suspense } from "react";

export default function TripsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="flex h-full min-h-[60vh] flex-col items-center justify-center p-4">
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <PlaneTakeoff />
            </EmptyMedia>
            <EmptyTitle>No trips yet</EmptyTitle>
            <EmptyDescription>
              Tell your agent what you&apos;re planning.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    </Suspense>
  );
}
