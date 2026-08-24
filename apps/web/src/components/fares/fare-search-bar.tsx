import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@atlas/ui/components/card";
import { formatShortDate } from "@atlas/utils/date";
import { Users } from "lucide-react";

import { useFareSearch } from "./fare-search-context";
import { cabinLabels } from "./fares-data";

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
    .map((date) => formatShortDate(date))
    .join(" – ");

  return (
    <Card
      className="relative w-full cursor-pointer hover:bg-muted/40 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50"
      size="sm"
    >
      <CardHeader className="flex flex-row flex-wrap items-center gap-x-3">
        <CardTitle>
          {origin?.code} → {destination?.code}
        </CardTitle>
        <span
          aria-hidden="true"
          className="size-1 shrink-0 rounded-full bg-muted-foreground"
        />
        <CardDescription className="flex flex-wrap items-center gap-x-3">
          <span>{dates}</span>
          <span
            aria-hidden="true"
            className="size-1 shrink-0 rounded-full bg-muted-foreground"
          />
          <span className="inline-flex items-center gap-1 [&_svg]:size-3.5">
            <Users />
            {passengers}
          </span>
          <span
            aria-hidden="true"
            className="size-1 shrink-0 rounded-full bg-muted-foreground"
          />
          <span>{cabinLabels[cabin]}</span>
        </CardDescription>
      </CardHeader>
      <button
        aria-label="Edit search"
        className="absolute inset-0 size-full cursor-pointer opacity-0"
        onClick={onEdit}
        type="button"
      />
    </Card>
  );
};

/** Keeps the trigger honest: nothing to collapse until a search has run. */
export const useIsSearchCollapsible = () => {
  const { results, search } = useFareSearch();
  return results.hasSearched && Boolean(search.origin && search.destination);
};
