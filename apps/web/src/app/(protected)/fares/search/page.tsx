import { Suspense } from "react";

import { FareResults } from "@/components/fares/fare-results";
import { FareSearchProvider } from "@/components/fares/fare-search-context";
import { FareSearchPanel } from "@/components/fares/fare-search-panel";
import { SavedFaresSheet } from "@/components/fares/saved-fares-sheet";

const FareSearchResults = () => (
  <FareSearchProvider source="url">
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 sm:p-6">
      {/* No page title: the app header already names the route, and two
          "Fares" headings stacked read as a rendering bug. */}
      <header className="flex justify-end">
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
