"use client";

import type { NearbyDatePrice } from "@atlas/api/routers/fare";
import { Button } from "@atlas/ui/components/button";
import { Skeleton } from "@atlas/ui/components/skeleton";
import { cn } from "@atlas/ui/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { CalendarRange } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

import { useFareSearch } from "./fare-search-context";
import { displayCurrency } from "./fares-data";

const SKELETON_CELLS = ["a", "b", "c", "d", "e", "f", "g"];

const weekdayFormatter = new Intl.DateTimeFormat("en-GB", { weekday: "short" });
const dayFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
});

const toIsoDate = (date: Date) => {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

const parseIsoDate = (value: string) => new Date(`${value}T00:00:00`);

const DateCell = ({
  isCheapest,
  onSelect,
  price,
}: {
  isCheapest: boolean;
  onSelect: () => void;
  price: NearbyDatePrice;
}) => {
  const date = parseIsoDate(price.date);

  return (
    <button
      aria-current={price.isCurrent ? "date" : undefined}
      className={cn(
        "flex min-w-20 flex-1 flex-col items-center gap-0.5 rounded-xl border px-2 py-2.5 transition-colors",
        price.hasFares ? "hover:bg-muted/50" : "opacity-60",
        price.isCurrent && "border-primary/50 bg-muted/40",
        isCheapest && !price.isCurrent && "border-primary/40"
      )}
      disabled={!price.hasFares || price.isCurrent}
      onClick={onSelect}
      type="button"
    >
      <span className="text-muted-foreground text-xs">
        {weekdayFormatter.format(date)}
      </span>
      <span className="font-medium text-sm">{dayFormatter.format(date)}</span>
      <span
        className={cn(
          "text-sm tabular-nums",
          isCheapest ? "font-semibold text-primary" : "text-muted-foreground"
        )}
      >
        {price.cheapestTotal === undefined
          ? "—"
          : Math.round(price.cheapestTotal)}
      </span>
    </button>
  );
};

/**
 * Prices the days either side of the chosen departure.
 *
 * A single fare answers nothing: "USD 103" only means something next to its
 * neighbours. Dates move airfare more than airline or time of day do, so this
 * is the one comparison the page most needs.
 *
 * Opt-in, because it costs one Atlas search per day shown.
 */
export const FlexibleDates = () => {
  const { results, runSearch, search, update } = useFareSearch();
  const [prices, setPrices] = useState<NearbyDatePrice[] | null>(null);

  const { isPending, mutate } = useMutation(
    trpc.fare.nearbyDates.mutationOptions({
      onError: () => {
        toast.error("Could not price the nearby dates.");
      },
      onSuccess: (nearby) => {
        if (nearby.length === 0) {
          toast.error("Could not price the nearby dates.");
          return;
        }

        setPrices(nearby);
      },
    })
  );

  const { cabin, departure, destination, origin, passengers, returnDate } =
    search;

  if (!(origin && destination && departure) || results.fares.length === 0) {
    return null;
  }

  const handleCheck = () => {
    mutate({
      adults: passengers,
      cabin,
      children: 0,
      currency: displayCurrency,
      departureDate: toIsoDate(departure),
      destination: destination.code,
      infants: 0,
      origin: origin.code,
      ...(returnDate === undefined
        ? {}
        : { returnDate: toIsoDate(returnDate) }),
    });
  };

  const handlePick = (price: NearbyDatePrice) => {
    const nextDeparture = parseIsoDate(price.date);
    const nextReturn =
      price.returnDate === undefined
        ? undefined
        : parseIsoDate(price.returnDate);

    update({ departure: nextDeparture, returnDate: nextReturn });
    runSearch({ departure: nextDeparture, returnDate: nextReturn });
  };

  if (prices === null) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed px-4 py-3">
        <p className="flex items-center gap-2 text-muted-foreground text-sm">
          <CalendarRange className="size-4" />
          Prices move with the date more than anything else.
        </p>
        <Button
          className="rounded-full"
          disabled={isPending}
          onClick={handleCheck}
          size="sm"
          type="button"
          variant="outline"
        >
          {isPending ? "Checking…" : "Compare nearby dates"}
        </Button>
      </div>
    );
  }

  const cheapest = Math.min(
    ...prices
      .map((price) => price.cheapestTotal)
      .filter((total): total is number => total !== undefined)
  );

  const currency =
    prices.find((price) => price.currency !== undefined)?.currency ?? "";

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="flex items-center gap-2 font-medium">
          <CalendarRange className="size-4 text-muted-foreground" />
          Nearby dates
        </h4>
        <p className="text-muted-foreground text-sm">
          cheapest adult total, {currency}
          {returnDate === undefined ? "" : " · trip length kept"}
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {isPending
          ? SKELETON_CELLS.map((cell) => (
              <Skeleton
                className="h-20 min-w-20 flex-1 rounded-xl"
                key={cell}
              />
            ))
          : prices.map((price) => (
              <DateCell
                isCheapest={price.cheapestTotal === cheapest}
                key={price.date}
                onSelect={() => handlePick(price)}
                price={price}
              />
            ))}
      </div>
    </section>
  );
};
