"use client";

import { Button } from "@atlas/ui/components/button";
import { formatShortDate } from "@atlas/utils/date";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, History, Sparkles } from "lucide-react";

import { trpc } from "@/utils/trpc";

import type { RecentSearch } from "./fare-search-context";
import { useFareSearch } from "./fare-search-context";
import { airportByCode } from "./fares-data";

const formatDates = (search: RecentSearch) => {
  const out = formatShortDate(search.departureDate);

  return search.returnDate === null
    ? `${out} · one way`
    : `${out} – ${formatShortDate(search.returnDate)}`;
};

const cityName = (code: string) => airportByCode.get(code)?.city ?? code;

/**
 * Onboarding for the second visit onwards.
 *
 * Every search is already recorded; nothing read it back, so the page opened
 * blank each time and people retyped the same trip. Only rendered while idle:
 * once results are on screen this would compete with them.
 */
export const RecentSearches = () => {
  const { applyRecentSearch, results } = useFareSearch();
  const { data: rows = [] } = useQuery({
    ...trpc.fare.recent.queryOptions(),
    // The agent panel searches while this page sits open beside it; without a
    // refetch its searches only appear after a reload.
    refetchInterval: 15_000,
  });

  if (rows.length === 0 || results.hasSearched) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3">
      <h3 className="flex items-center gap-2 font-semibold text-lg">
        <History className="size-4 text-muted-foreground" />
        Pick up where you left off
      </h3>

      {/*
        A row, not a stack. Four full-width bars under the form read as a
        second list competing with the search card; as cards side by side they
        read as what they are — somewhere to resume from. The row scrolls
        rather than wrapping, so a fifth trip lengthens nothing.
      */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {rows.map((search) => (
          <Button
            className="h-auto min-w-56 shrink-0 flex-col items-start gap-1.5 rounded-2xl border px-4 py-3 font-normal"
            key={search.id}
            onClick={() => applyRecentSearch(search)}
            type="button"
            variant="outline"
          >
            <span className="flex w-full items-center gap-2 text-left">
              <span className="font-medium">{cityName(search.origin)}</span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              <span className="font-medium">
                {cityName(search.destination)}
              </span>
            </span>
            <span className="flex w-full items-center gap-2 text-muted-foreground text-sm">
              <span>{formatDates(search)}</span>
            </span>
            <span className="flex w-full items-center gap-2 text-muted-foreground text-xs">
              {search.source === "agent" && (
                <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                  <Sparkles className="size-3" />
                  AI
                </span>
              )}
              {search.resultCount === 0
                ? "no fares last time"
                : `${search.resultCount} fares`}
            </span>
          </Button>
        ))}
      </div>
    </section>
  );
};
