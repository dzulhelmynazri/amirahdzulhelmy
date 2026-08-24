import { Suspense } from "react";

import { FareResults } from "@/components/fares/fare-results";
import { FareSearchProvider } from "@/components/fares/fare-search-context";
import { FareSearchPanel } from "@/components/fares/fare-search-panel";
import { SavedFaresSheet } from "@/components/fares/saved-fares-sheet";

const FareSearchResults = () => (
  <FareSearchProvider source="url">
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="font-semibold text-3xl tracking-tight">Fares</h2>
          <p className="text-muted-foreground">
            Live prices from 140+ airlines. Compare before you commit.
          </p>
        </div>
        <SavedFaresSheet />
      </header>

      <FareSearchPanel />
      <FareResults />
    </div>
  </FareSearchProvider>
);

export default function FareSearchPage() {
  return (
    <Suspense>
      <FareSearchResults />
    </Suspense>
  );
}
