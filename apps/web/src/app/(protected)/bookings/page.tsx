import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@atlas/ui/components/empty";
import { CalendarDays } from "lucide-react";
import { Suspense } from "react";

export default function BookingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="flex h-full min-h-[60vh] flex-col items-center justify-center p-4">
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <CalendarDays />
            </EmptyMedia>
            <EmptyTitle>No bookings yet</EmptyTitle>
            <EmptyDescription>
              Your upcoming and past bookings will appear here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    </Suspense>
  );
}
