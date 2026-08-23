"use client";

import { Button } from "@atlas/ui/components/button";
import { ArrowRight, History } from "lucide-react";
import { useEffect, useState } from "react";

import type { RecentSearch } from "@/app/actions/fares";
import { listRecentSearches } from "@/app/actions/fares";

import { airportByCode } from "./fares-data";
import { useFareSearch } from "./use-fare-search";

const rangeFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
});

const formatDates = (search: RecentSearch) => {
  const out = rangeFormatter.format(new Date(search.departureDate));

  return search.returnDate === null
    ? `${out} · one way`
    : `${out} – ${rangeFormatter.format(new Date(search.returnDate))}`;
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
  const [rows, setRows] = useState<RecentSearch[]>([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const recent = await listRecentSearches();
      if (active) {
        setRows(recent);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  if (rows.length === 0 || results.hasSearched) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3">
      <h3 className="flex items-center gap-2 font-semibold text-lg">
        <History className="size-4 text-muted-foreground" />
        Pick up where you left off
      </h3>

      <div className="flex flex-col gap-2">
        {rows.map((search) => (
          <Button
            className="h-auto justify-start gap-3 rounded-2xl border px-4 py-3 font-normal"
            key={search.id}
            onClick={() => applyRecentSearch(search)}
            type="button"
            variant="outline"
          >
            <span className="flex flex-1 flex-wrap items-center gap-2 text-left">
              <span className="font-medium">{cityName(search.origin)}</span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              <span className="font-medium">
                {cityName(search.destination)}
              </span>
              <span aria-hidden="true" className="text-muted-foreground">
                ·
              </span>
              <span className="text-muted-foreground text-sm">
                {formatDates(search)}
              </span>
            </span>
            <span className="shrink-0 text-muted-foreground text-sm">
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
