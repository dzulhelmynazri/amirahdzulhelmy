"use client";

import { Badge } from "@atlas/ui/components/badge";
import { Button } from "@atlas/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@atlas/ui/components/empty";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@atlas/ui/components/sheet";
import { Skeleton } from "@atlas/ui/components/skeleton";
import { cn } from "@atlas/ui/lib/utils";
import { Bookmark, Luggage, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { removeSavedFare } from "@/app/actions/saved-fares";

import { airlines } from "./fares-data";
import type { SavedFareRow } from "./use-fare-search";
import { useFareSearch } from "./use-fare-search";

const SKELETON_ROWS = ["a", "b", "c"];

const savedAtFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
});

const airlineName = (code: string) => airlines[code]?.name ?? code;

const SavedRow = ({
  fare,
  onRemoved,
}: {
  fare: SavedFareRow;
  onRemoved: (id: string) => void;
}) => {
  const [isRemoving, startRemoving] = useTransition();

  const handleRemove = () => {
    startRemoving(async () => {
      const result = await removeSavedFare(fare.id);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      onRemoved(fare.id);
    });
  };

  return (
    <li
      className={cn(
        "group flex flex-col gap-2 rounded-xl border p-3 transition-opacity",
        isRemoving && "opacity-50"
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full font-semibold text-[10px]",
            airlines[fare.airline]?.tint ?? "bg-muted text-muted-foreground"
          )}
        >
          {fare.airline}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-medium">
            {airlineName(fare.airline)}
          </span>
          <span className="truncate text-muted-foreground text-xs">
            {fare.flightNumbers}
          </span>
        </div>
        <Button
          aria-label={`Remove saved ${airlineName(fare.airline)} fare`}
          className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
          disabled={isRemoving}
          onClick={handleRemove}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <Trash2 />
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex flex-wrap items-center gap-1.5 text-muted-foreground text-xs">
          {fare.stops === 0
            ? "Non-stop"
            : `${fare.stops} stop${fare.stops === 1 ? "" : "s"}`}
          {fare.cabin ? (
            <>
              <span aria-hidden="true">·</span>
              {fare.cabin}
            </>
          ) : null}
          {fare.baggageIncluded ? (
            <Badge variant="outline">
              <Luggage />
              Bag
            </Badge>
          ) : null}
        </span>
        <span className="text-right">
          <span className="font-semibold">
            {fare.currency} {Number(fare.priceAtSave).toFixed(2)}
          </span>
          <span className="block text-muted-foreground text-[11px]">
            saved {savedAtFormatter.format(fare.createdAt)}
          </span>
        </span>
      </div>
    </li>
  );
};

/**
 * Saved fares live in a sheet, not a page section.
 *
 * As a section its empty state ate 40% of the viewport above the fold to say
 * "nothing here" — a permanent hole carved out for a feature most visits never
 * touch. A trigger that only appears once something is saved costs nothing when
 * unused, and stays reachable from anywhere on the page.
 */
export const SavedFaresSheet = () => {
  const { removeSaved, savedFares } = useFareSearch();

  if (savedFares === null) {
    return <Skeleton className="h-8 w-24 rounded-full" />;
  }

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button className="rounded-full" size="sm" variant="outline">
            <Bookmark />
            Saved
            {savedFares.length > 0 ? (
              <Badge variant="secondary">{savedFares.length}</Badge>
            ) : null}
          </Button>
        }
      />
      <SheetContent className="gap-0" side="right">
        <SheetHeader>
          <SheetTitle>Saved fares</SheetTitle>
          <SheetDescription>
            Prices from the moment you saved them. Airlines change fares often,
            so search again before you book.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {savedFares.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia>
                  <Bookmark />
                </EmptyMedia>
                <EmptyTitle>Nothing saved yet</EmptyTitle>
                <EmptyDescription>
                  Search a route, then tap the bookmark on any result to keep it
                  here for comparison.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="flex flex-col gap-2">
              {savedFares.map((fare) => (
                <SavedRow fare={fare} key={fare.id} onRemoved={removeSaved} />
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export const SavedFaresSkeleton = () => (
  <div className="flex flex-col gap-2">
    {SKELETON_ROWS.map((row) => (
      <Skeleton className="h-16 rounded-xl" key={row} />
    ))}
  </div>
);
