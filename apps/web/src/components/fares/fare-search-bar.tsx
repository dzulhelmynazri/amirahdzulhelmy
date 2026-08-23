"use client";

import { Pencil, Users } from "lucide-react";

import { useFareSearch } from "./fare-search-context";
import { cabinLabels } from "./fares-data";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
});

/**
 * The search card once a search has run.
 *
 * A 600px form is the star of an empty page and dead weight on a full one —
 * it pushed results below the fold and made every list feel endless. Collapsed
 * it keeps the criteria visible (so nobody has to remember what they asked
 * for) while handing the canvas to the results.
 */
export const FareSearchBar = ({ onEdit }: { onEdit: () => void }) => {
  const { search } = useFareSearch();
  const { cabin, departure, destination, origin, passengers, returnDate } =
    search;

  const dates = [departure, returnDate]
    .filter((date): date is Date => date !== undefined)
    .map((date) => dateFormatter.format(date))
    .join(" – ");

  return (
    <button
      className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/40"
      onClick={onEdit}
      type="button"
    >
      <span className="font-semibold">
        {origin?.code} → {destination?.code}
      </span>

      <span aria-hidden="true" className="text-muted-foreground">
        ·
      </span>
      <span className="text-muted-foreground text-sm">{dates}</span>

      <span aria-hidden="true" className="text-muted-foreground">
        ·
      </span>
      <span className="inline-flex items-center gap-1 text-muted-foreground text-sm">
        <Users className="size-3.5" />
        {passengers}
      </span>

      <span aria-hidden="true" className="text-muted-foreground">
        ·
      </span>
      <span className="text-muted-foreground text-sm">
        {cabinLabels[cabin]}
      </span>

      <span className="ml-auto inline-flex items-center gap-1.5 text-muted-foreground text-sm">
        <Pencil className="size-3.5" />
        Edit
      </span>
    </button>
  );
};

/** Keeps the trigger honest: nothing to collapse until a search has run. */
export const useIsSearchCollapsible = () => {
  const { results, search } = useFareSearch();
  return results.hasSearched && Boolean(search.origin && search.destination);
};
