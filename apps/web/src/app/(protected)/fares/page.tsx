import { FareIdleState } from "@/components/fares/fare-idle-state";
import { FareResults } from "@/components/fares/fare-results";
import { FareSearchPanel } from "@/components/fares/fare-search-panel";
import { SavedFaresSheet } from "@/components/fares/saved-fares";
import { FareSearchProvider } from "@/components/fares/use-fare-search";

export default function FaresPage() {
  return (
    <FareSearchProvider>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6">
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

        {/* Exactly one of these renders: results once a search has run, the
            idle content before that. Never both, never two empty sections. */}
        <FareResults />
        <FareIdleState />
      </div>
    </FareSearchProvider>
  );
}
