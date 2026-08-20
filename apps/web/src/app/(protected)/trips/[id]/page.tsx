"use client";

import { Separator } from "@atlas/ui/components/separator";
import { Skeleton } from "@atlas/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

import TripsEditor from "@/components/editor/trips-editor";
import { trpc } from "@/utils/trpc";

const ToolbarGroupSkeleton = ({
  children,
  last = false,
}: {
  children: React.ReactNode;
  last?: boolean;
}) => (
  <div className="flex items-center">
    <div className="flex items-center">{children}</div>
    {!last && (
      <div className="mx-1.5 py-0.5">
        <Separator orientation="vertical" />
      </div>
    )}
  </div>
);

const TripEditorSkeleton = () => (
  <div className="flex h-full flex-col overflow-hidden">
    <div className="flex w-full items-center border-b border-b-border p-3">
      {/* Undo / Redo */}
      <ToolbarGroupSkeleton>
        <Skeleton className="h-8 w-16 rounded-md" />
      </ToolbarGroupSkeleton>

      {/* Turn into dropdown */}
      <ToolbarGroupSkeleton>
        <Skeleton className="h-8 min-w-[120px] rounded-md" />
      </ToolbarGroupSkeleton>

      {/* List split buttons */}
      <ToolbarGroupSkeleton>
        <Skeleton className="h-8 w-36 rounded-md" />
      </ToolbarGroupSkeleton>

      {/* Bold / Italic / Underline / Strikethrough */}
      <ToolbarGroupSkeleton>
        <Skeleton className="h-8 w-36 rounded-md" />
      </ToolbarGroupSkeleton>

      {/* Link */}
      <ToolbarGroupSkeleton last>
        <Skeleton className="size-8 rounded-md" />
      </ToolbarGroupSkeleton>
    </div>
    <div className="flex flex-col gap-3 p-4 text-muted-foreground">
      Wait ahh...
    </div>
  </div>
);

const TripPage = () => {
  const params = useParams<{ id: string }>();
  const trip = useQuery(trpc.trips.getById.queryOptions({ id: params.id }));

  if (trip.isLoading) {
    return (
      <div className="h-full">
        <TripEditorSkeleton />
      </div>
    );
  }

  if (trip.isError) {
    return <div className="p-8 text-muted-foreground">Trip not found.</div>;
  }

  if (!trip.data) {
    return null;
  }

  return (
    <div className="h-full">
      <TripsEditor key={trip.data.id} trip={trip.data} />
    </div>
  );
};

export default TripPage;
