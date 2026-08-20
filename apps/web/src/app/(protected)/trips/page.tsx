"use client";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@atlas/ui/components/empty";
import { useQuery } from "@tanstack/react-query";
import { MousePointerClick } from "lucide-react";

import { trpc } from "@/utils/trpc";

const TripsList = () => {
  const trips = useQuery(trpc.trips.list.queryOptions());

  if (trips.isLoading) {
    return <div className="p-8 text-muted-foreground">Loading trips...</div>;
  }

  const tripList = trips.data ?? [];

  if (tripList.length === 0) {
    return (
      <div className="flex h-full min-h-[60vh] flex-col items-center justify-center p-4">
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <MousePointerClick />
            </EmptyMedia>
            <EmptyTitle>No trips yet</EmptyTitle>
            <EmptyDescription>
              Create a trip from the sidebar to get started.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center p-4">
      <Empty>
        <EmptyHeader>
          <EmptyMedia>
            <MousePointerClick />
          </EmptyMedia>
          <EmptyTitle>Select a trip</EmptyTitle>
          <EmptyDescription>
            Choose a trip from the sidebar to start editing.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
};

export default function TripsPage() {
  return (
    <div className="h-full">
      <TripsList />
    </div>
  );
}
