"use client";

import { FareSearchProvider } from "./fare-search-context";
import { FareSearchForm } from "./fare-search-form";
import { RecentSearches } from "./recent-searches";
import { SavedFaresSheet } from "./saved-fares-sheet";

/**
 * The form is still the anchor. A stacked pile of shortcut cards under it was
 * tried and read as clutter, so the AI entry lives inside the search card and
 * nothing else competes with it.
 *
 * What that removal took with it was every way back. Searches were recorded
 * and never read back, and Saved only existed in the results header — so the
 * one page a traveller lands on offered a blank form and no trace of the work
 * they had already done. Saved belongs in the header of both pages, and one
 * quiet row of recent searches is not the pile that was cut.
 */
export const FaresCompose = () => (
  <FareSearchProvider source="form">
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 sm:p-6">
      {/* No page title: the app header already names the route, and two
          "Fares" headings stacked read as a rendering bug. */}
      <header className="flex justify-end">
        <SavedFaresSheet />
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <div className="w-full max-w-lg">
          <FareSearchForm />
        </div>
        <div className="w-full max-w-lg">
          <RecentSearches />
        </div>
      </div>
    </div>
  </FareSearchProvider>
);
