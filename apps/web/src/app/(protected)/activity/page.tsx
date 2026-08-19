import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@atlas/ui/components/empty";
import { History } from "lucide-react";
import { Suspense } from "react";

export default function ActivityPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="flex h-full min-h-[60vh] flex-col items-center justify-center p-4">
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <History />
            </EmptyMedia>
            <EmptyTitle>No activity yet</EmptyTitle>
            <EmptyDescription>
              Your activity history will appear here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    </Suspense>
  );
}
