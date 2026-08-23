"use client";

import { Button } from "@atlas/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@atlas/ui/components/empty";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@atlas/ui/components/hover-card";
import { cn } from "@atlas/ui/lib/utils";
import {
  ArrowRight,
  ChevronRight,
  Info,
  SearchX,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useAgentSidebarSync } from "@/hooks/use-agent-panel";

import {
  airlines,
  airportByCode,
  dealOriginCodes,
  fareCurrency,
  fareDeals,
} from "./fares-data";
import type { FareDeal } from "./fares-data";
import { useFareSearch } from "./use-fare-search";

const dealDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
});

const priceFormatter = new Intl.NumberFormat("en-MY");

const formatDealRange = (deal: FareDeal) =>
  `${dealDateFormatter.format(new Date(deal.departureDate))} – ${dealDateFormatter.format(
    new Date(deal.returnDate)
  )}`;

const formatStops = (stops: number) => {
  if (stops === 0) {
    return "Non-stop";
  }

  return `${stops} stop${stops === 1 ? "" : "s"}`;
};

const AiDealsBanner = () => {
  const { openAgent } = useAgentSidebarSync();

  return (
    <div className="flex flex-col gap-4 rounded-2xl border bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="flex flex-col gap-0.5">
          <p className="font-medium">Flexible? Let the agent hunt the fares</p>
          <p className="text-muted-foreground text-sm">
            Describe your ideal trip and the booking agent will search deals
            across your dates.
          </p>
        </div>
      </div>
      <Button
        className="shrink-0 rounded-full"
        onClick={() => openAgent(false)}
        type="button"
        variant="outline"
      >
        Explore deals with AI
      </Button>
    </div>
  );
};

const FareDealCard = ({
  deal,
  onSelect,
}: {
  deal: FareDeal;
  onSelect: (deal: FareDeal) => void;
}) => {
  const origin = airportByCode.get(deal.originCode);
  const destination = airportByCode.get(deal.destinationCode);
  const airline = airlines[deal.airlineCode];

  if (!(origin && destination && airline)) {
    return null;
  }

  return (
    <button
      aria-label={`Fill the search with ${origin.city} to ${destination.city}, from ${fareCurrency} ${deal.price}`}
      className="group flex flex-col gap-3 rounded-2xl border bg-card p-4 text-left transition-colors hover:bg-muted/50"
      onClick={() => onSelect(deal)}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-medium leading-snug">{origin.city}</span>
        <span className="flex items-center gap-2 font-medium leading-snug">
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
          {destination.city}
        </span>
      </div>

      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full font-semibold text-[10px]",
            airline.tint
          )}
          title={airline.name}
        >
          {airline.code}
        </span>
        <span>{formatDealRange(deal)}</span>
        <span aria-hidden="true">·</span>
        <span>{formatStops(deal.stops)}</span>
      </div>

      <div className="flex items-center justify-end gap-1 font-medium">
        from {fareCurrency} {priceFormatter.format(deal.price)}
        <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
};

export const FareDeals = () => {
  const { applyDeal } = useFareSearch();
  const [originCode, setOriginCode] = useState<string>(dealOriginCodes[0]);

  const deals = useMemo(
    () => fareDeals.filter((deal) => deal.originCode === originCode),
    [originCode]
  );

  const handleSelect = (deal: FareDeal) => {
    applyDeal(deal);

    const destination = airportByCode.get(deal.destinationCode);

    toast.success("Search updated", {
      description: `${deal.originCode} → ${deal.destinationCode}${
        destination ? ` · ${destination.city}` : ""
      } · ${formatDealRange(deal)}`,
    });
  };

  return (
    <section className="flex flex-col gap-4">
      <AiDealsBanner />

      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-lg">
          Find cheap flights from Malaysia to anywhere
        </h3>
        <HoverCard>
          <HoverCardTrigger
            aria-label="About these fares"
            className="text-muted-foreground"
          >
            <Info className="size-4" />
          </HoverCardTrigger>
          <HoverCardContent>
            <p className="text-muted-foreground">
              Sample round-trip fares per traveller in economy. Prices are mock
              data until live fare search is connected.
            </p>
          </HoverCardContent>
        </HoverCard>
      </div>

      <div className="flex flex-wrap gap-2">
        {dealOriginCodes.map((code) => {
          const airport = airportByCode.get(code);
          const isActive = code === originCode;

          return (
            <Button
              aria-pressed={isActive}
              className="rounded-full"
              key={code}
              onClick={() => setOriginCode(code)}
              size="sm"
              type="button"
              variant={isActive ? "secondary" : "outline"}
            >
              {airport?.city ?? code}
            </Button>
          );
        })}
      </div>

      {deals.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>No deals for this origin</EmptyTitle>
            <EmptyDescription>
              Try another departure city from the list above.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {deals.map((deal) => (
            <FareDealCard deal={deal} key={deal.id} onSelect={handleSelect} />
          ))}
        </div>
      )}

      <p className="text-muted-foreground text-sm">
        Pick a deal to fill the search above. Fare results are not connected
        yet.
      </p>
    </section>
  );
};
