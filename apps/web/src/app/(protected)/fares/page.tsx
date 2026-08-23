import { FareDeals } from "@/components/fares/fare-deals";
import { FareSearchForm } from "@/components/fares/fare-search-form";
import { FareSearchProvider } from "@/components/fares/use-fare-search";

export default function FaresPage() {
  return (
    <FareSearchProvider>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-4 sm:p-6">
        <div className="flex flex-col gap-1 text-center">
          <h2 className="font-semibold text-3xl tracking-tight">Fares</h2>
          <p className="text-muted-foreground">
            Search flights and compare fares before you commit to a trip.
          </p>
        </div>
        <div className="mx-auto w-full max-w-lg">
          <FareSearchForm />
        </div>
        <FareDeals />
      </div>
    </FareSearchProvider>
  );
}
