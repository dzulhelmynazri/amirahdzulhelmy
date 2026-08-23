"use client";

import type {
  FareLeg,
  NormalizedFare,
} from "@atlas/atlas-client/fare-compare/types";
import { Badge } from "@atlas/ui/components/badge";
import { Button } from "@atlas/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@atlas/ui/components/empty";
import { Skeleton } from "@atlas/ui/components/skeleton";
import { cn } from "@atlas/ui/lib/utils";
import { formatWeekdayDate } from "@atlas/utils/date";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dedent from "dedent";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  ChevronRight,
  Luggage,
  SearchX,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useAgentSidebarSync } from "@/hooks/use-agent-panel";
import { trpc } from "@/utils/trpc";

import { useFareSearch } from "./fare-search-context";
import { airlines } from "./fares-data";

const MINUTES_PER_HOUR = 60;
const SKELETON_ROWS = ["a", "b", "c"];

type SortKey = "cheapest" | "earliest" | "fastest";

const SORT_LABELS: Record<SortKey, string> = {
  cheapest: "Cheapest",
  earliest: "Earliest",
  fastest: "Fastest",
};

const SORT_ORDER: SortKey[] = ["cheapest", "fastest", "earliest"];

const formatDuration = (minutes: number | undefined) => {
  if (minutes === undefined || minutes <= 0) {
    return null;
  }
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const rest = minutes % MINUTES_PER_HOUR;
  return hours === 0 ? `${rest}m` : `${hours}h ${rest}m`;
};

const formatStops = (stops: number) =>
  stops === 0 ? "Non-stop" : `${stops} stop${stops === 1 ? "" : "s"}`;

const money = (value: number, currency: string) =>
  `${currency} ${value.toFixed(2)}`;

const airlineName = (code: string) => airlines[code]?.name ?? code;

const legKey = (leg: FareLeg) => leg.flightNumbers.join("-");

const AirlineBadge = ({ code }: { code: string }) => (
  <span
    className={cn(
      "flex size-8 shrink-0 items-center justify-center rounded-full font-semibold text-xs",
      airlines[code]?.tint ?? "bg-muted text-muted-foreground"
    )}
    title={airlineName(code)}
  >
    {code}
  </span>
);

/**
 * Times are the whole point of a flight row, and they were being thrown away
 * during normalization — which is exactly why every row looked identical.
 * Departure and arrival get the largest type, joined by the duration line.
 */
const LegTimes = ({ leg }: { leg: FareLeg }) => (
  <div className="flex min-w-0 flex-1 items-center gap-3">
    <div className="text-right">
      <div className="font-semibold tabular-nums">{leg.departureTime}</div>
      <div className="text-muted-foreground text-xs">
        {leg.departureAirport}
      </div>
    </div>

    <div className="flex min-w-16 flex-1 flex-col items-center gap-1">
      <span className="text-muted-foreground text-xs">
        {formatDuration(leg.durationMinutes)}
      </span>
      <span aria-hidden="true" className="h-px w-full bg-border" />
      <span className="text-muted-foreground text-xs">
        {formatStops(leg.stops)}
      </span>
    </div>

    <div>
      <div className="font-semibold tabular-nums">
        {leg.arrivalTime}
        {leg.dayOffset > 0 ? (
          <sup className="ml-0.5 font-normal text-muted-foreground text-xs">
            +{leg.dayOffset}
          </sup>
        ) : null}
      </div>
      <div className="text-muted-foreground text-xs">{leg.arrivalAirport}</div>
    </div>
  </div>
);

/**
 * Hands a chosen flight to the agent with every detail it needs already in the
 * message — route, dates, passengers, price and the opaque `routingIdentifier`
 * that downstream Atlas calls require. Flight Guardian's own instructions say
 * specialists cannot see this conversation, so the message has to carry it all.
 */
const buildHandoff = (fare: NormalizedFare, passengers: number) => {
  const outbound = `${fare.outbound.flightNumbers.join("/")} ${fare.outbound.departureAirport} ${fare.outbound.departureTime} to ${fare.outbound.arrivalAirport} ${fare.outbound.arrivalTime} on ${fare.outbound.date}`;
  const inbound = fare.inbound
    ? `\nReturn: ${fare.inbound.flightNumbers.join("/")} ${fare.inbound.departureAirport} ${fare.inbound.departureTime} to ${fare.inbound.arrivalAirport} ${fare.inbound.arrivalTime} on ${fare.inbound.date}`
    : "";
  const cabin = fare.cabin ? `\nFare family: ${fare.cabin}` : "";

  return dedent`
    I want to book this flight — please verify it is still available and walk me through booking.

    Route: ${fare.origin} to ${fare.destination}
    Outbound: ${outbound}${inbound}
    Airline: ${airlineName(fare.airline)} (${fare.airline})
    Price quoted: ${money(fare.adultTotal, fare.currency)} per adult, ${passengers} traveller${passengers === 1 ? "" : "s"}${cabin}
    Baggage: ${fare.baggage.description}
    routingIdentifier: ${fare.routingIdentifier ?? "unavailable"}
  `;
};

const BookWithAgentButton = ({ fare }: { fare: NormalizedFare }) => {
  const { handOffToAgent } = useAgentSidebarSync();
  const { search } = useFareSearch();

  return (
    <Button
      className="rounded-full"
      disabled={!fare.sellable}
      onClick={() => handOffToAgent(buildHandoff(fare, search.passengers))}
      size="sm"
      title={fare.sellable ? undefined : fare.sellableReason}
      type="button"
    >
      <Sparkles />
      Book with agent
    </Button>
  );
};

const SaveFareButton = ({
  fare,
  searchId,
}: {
  fare: NormalizedFare;
  searchId: string | undefined;
}) => {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const saveFare = useMutation(
    trpc.fare.saved.create.mutationOptions({
      onError: (error) => {
        toast.error(error.message);
      },
      onSuccess: () => {
        setSaved(true);
        toast.success("Saved", {
          description: "Find it under Saved at the top of the page.",
        });
        void queryClient.invalidateQueries(trpc.fare.saved.list.queryFilter());
      },
    })
  );

  const handleSave = () => {
    saveFare.mutate({
      airline: fare.airline,
      baggageIncluded: fare.baggage.included,
      currency: fare.currency,
      flightNumbers: fare.flightNumbers.join(" "),
      priceAtSave: fare.adultTotal.toFixed(2),
      stops: fare.stops,
      ...(fare.cabin === undefined ? {} : { cabin: fare.cabin }),
      ...(fare.routingIdentifier === undefined
        ? {}
        : { routingIdentifier: fare.routingIdentifier }),
      ...(searchId === undefined ? {} : { searchId }),
    });
  };

  return (
    <Button
      aria-label={saved ? "Fare saved" : "Save this fare"}
      disabled={saveFare.isPending || saved}
      onClick={handleSave}
      size="icon-sm"
      type="button"
      variant="ghost"
    >
      {saved ? <BookmarkCheck /> : <Bookmark />}
    </Button>
  );
};

interface OutboundGroup {
  cheapest: number;
  currency: string;
  fares: NormalizedFare[];
  key: string;
  leg: FareLeg;
}

/**
 * Atlas returns every outbound x inbound combination as its own routing, so 11
 * outbound flights against 10 returns arrive as 100 near-identical rows.
 * Grouping by outbound leg restores the 11 real choices, and the return flights
 * become a second step instead of a multiplier.
 */
const groupByOutbound = (fares: NormalizedFare[]): OutboundGroup[] => {
  const groups = new Map<string, OutboundGroup>();

  for (const fare of fares) {
    const key = legKey(fare.outbound);
    const existing = groups.get(key);

    if (existing) {
      existing.fares.push(fare);
      existing.cheapest = Math.min(existing.cheapest, fare.adultTotal);
    } else {
      groups.set(key, {
        cheapest: fare.adultTotal,
        currency: fare.currency,
        fares: [fare],
        key,
        leg: fare.outbound,
      });
    }
  }

  return [...groups.values()];
};

const sortFares = (fares: NormalizedFare[], sortKey: SortKey) =>
  fares.toSorted((a, b) => {
    if (sortKey === "cheapest") {
      return a.adultTotal - b.adultTotal;
    }
    if (sortKey === "fastest") {
      return (
        (a.durationMinutes ?? Number.MAX_SAFE_INTEGER) -
        (b.durationMinutes ?? Number.MAX_SAFE_INTEGER)
      );
    }
    return a.outbound.departureTime.localeCompare(b.outbound.departureTime);
  });

const sortGroups = (groups: OutboundGroup[], sortKey: SortKey) =>
  groups.toSorted((a, b) => {
    if (sortKey === "cheapest") {
      return a.cheapest - b.cheapest;
    }
    if (sortKey === "fastest") {
      return (
        (a.leg.durationMinutes ?? Number.MAX_SAFE_INTEGER) -
        (b.leg.durationMinutes ?? Number.MAX_SAFE_INTEGER)
      );
    }
    return a.leg.departureTime.localeCompare(b.leg.departureTime);
  });

const OutboundRow = ({
  group,
  isBest,
  onSelect,
}: {
  group: OutboundGroup;
  isBest: boolean;
  onSelect: () => void;
}) => (
  <li>
    <button
      className={cn(
        "flex w-full flex-wrap items-center gap-4 rounded-2xl border bg-card p-4 text-left transition-colors hover:bg-muted/40",
        isBest && "border-primary/40"
      )}
      onClick={onSelect}
      type="button"
    >
      <AirlineBadge code={group.leg.carrier} />
      <LegTimes leg={group.leg} />

      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="flex items-center justify-end gap-1.5 font-semibold">
            {isBest ? <Badge variant="secondary">Best</Badge> : null}
            {money(group.cheapest, group.currency)}
          </div>
          <div className="text-muted-foreground text-xs">
            {group.fares.length} return
            {group.fares.length === 1 ? "" : "s"}
          </div>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </div>
    </button>
  </li>
);

const FareRow = ({
  fare,
  isBest,
  searchId,
  showReturn,
}: {
  fare: NormalizedFare;
  isBest: boolean;
  searchId: string | undefined;
  showReturn: boolean;
}) => (
  <li
    className={cn(
      "flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-4",
      isBest && "border-primary/40"
    )}
  >
    <AirlineBadge code={fare.airline} />
    <LegTimes leg={showReturn && fare.inbound ? fare.inbound : fare.outbound} />

    <div className="flex items-center gap-2">
      <div className="text-right">
        <div className="flex items-center justify-end gap-1.5 font-semibold">
          {isBest ? <Badge variant="secondary">Best</Badge> : null}
          {money(fare.adultTotal, fare.currency)}
        </div>
        <div className="flex items-center justify-end gap-1.5 text-muted-foreground text-xs">
          {fare.baggage.included ? (
            <span className="inline-flex items-center gap-1">
              <Luggage className="size-3" />
              bag
            </span>
          ) : null}
          {fare.cabin ? <span>{fare.cabin}</span> : null}
        </div>
      </div>
      <SaveFareButton fare={fare} searchId={searchId} />
      {showReturn || !fare.inbound ? <BookWithAgentButton fare={fare} /> : null}
    </div>
  </li>
);

const LoadingState = () => (
  <section className="flex flex-col gap-3">
    <h3 className="font-semibold text-lg">Searching…</h3>
    {SKELETON_ROWS.map((row) => (
      <Skeleton className="h-20 rounded-2xl" key={row} />
    ))}
  </section>
);

const NoResultsState = () => {
  const { results, searchOnDate } = useFareSearch();

  return (
    <section className="flex flex-col gap-3">
      <Empty>
        <EmptyHeader>
          <EmptyMedia>
            <SearchX />
          </EmptyMedia>
          <EmptyTitle>No flights found</EmptyTitle>
          <EmptyDescription>
            {results.noResultMessage ?? "No flights found for these dates."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>

      {results.nearbyDates && results.nearbyDates.length > 0 ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-muted-foreground text-sm">
            These dates do have flights:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {results.nearbyDates.map((date) => (
              <Button
                className="rounded-full"
                key={date}
                onClick={() => searchOnDate(date)}
                size="sm"
                type="button"
                variant="outline"
              >
                <CalendarDays />
                {formatWeekdayDate(date)}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
};

const FilterBar = ({
  airlineFilter,
  availableAirlines,
  nonStopOnly,
  onAirlineChange,
  onSortCycle,
  onToggleNonStop,
  sortKey,
}: {
  airlineFilter: string | null;
  availableAirlines: string[];
  nonStopOnly: boolean;
  onAirlineChange: (code: string | null) => void;
  onSortCycle: () => void;
  onToggleNonStop: () => void;
  sortKey: SortKey;
}) => (
  <div className="flex flex-wrap items-center gap-2">
    <Button
      aria-pressed={airlineFilter === null}
      className="rounded-full"
      onClick={() => onAirlineChange(null)}
      size="sm"
      type="button"
      variant={airlineFilter === null ? "secondary" : "outline"}
    >
      All airlines
    </Button>
    {availableAirlines.map((code) => (
      <Button
        aria-pressed={airlineFilter === code}
        className="rounded-full"
        key={code}
        onClick={() => onAirlineChange(code)}
        size="sm"
        type="button"
        variant={airlineFilter === code ? "secondary" : "outline"}
      >
        {airlineName(code)}
      </Button>
    ))}

    <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />

    <Button
      aria-pressed={nonStopOnly}
      className="rounded-full"
      onClick={onToggleNonStop}
      size="sm"
      type="button"
      variant={nonStopOnly ? "secondary" : "outline"}
    >
      Non-stop
    </Button>
    <Button
      className="rounded-full"
      onClick={onSortCycle}
      size="sm"
      type="button"
      variant="outline"
    >
      Sort: {SORT_LABELS[sortKey]}
    </Button>
  </div>
);

const countLabel = (
  count: number,
  showingReturns: boolean,
  isRoundTrip: boolean
) => {
  if (showingReturns) {
    return count === 1 ? "return flight" : "return flights";
  }
  if (isRoundTrip) {
    return count === 1 ? "outbound flight" : "outbound flights";
  }
  return count === 1 ? "flight" : "flights";
};

export const FareResults = () => {
  const { backToBrowse, isSearching, results } = useFareSearch();
  const [airlineFilter, setAirlineFilter] = useState<string | null>(null);
  const [nonStopOnly, setNonStopOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("cheapest");
  const [selectedOutbound, setSelectedOutbound] = useState<string | null>(null);

  const availableAirlines = useMemo(
    () => [...new Set(results.fares.map((fare) => fare.airline))].toSorted(),
    [results.fares]
  );

  const filtered = useMemo(
    () =>
      results.fares.filter(
        (fare) =>
          (airlineFilter === null || fare.airline === airlineFilter) &&
          (!nonStopOnly || fare.stops === 0)
      ),
    [airlineFilter, nonStopOnly, results.fares]
  );

  const isRoundTrip = filtered.some((fare) => fare.inbound !== undefined);

  const groups = useMemo(
    () => (isRoundTrip ? sortGroups(groupByOutbound(filtered), sortKey) : []),
    [filtered, isRoundTrip, sortKey]
  );

  if (isSearching) {
    return <LoadingState />;
  }

  if (!results.hasSearched) {
    return null;
  }

  if (results.error) {
    return (
      <section className="flex flex-col gap-3">
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <TriangleAlert />
            </EmptyMedia>
            <EmptyTitle>Search failed</EmptyTitle>
            <EmptyDescription>{results.error}</EmptyDescription>
          </EmptyHeader>
        </Empty>
        {results.requestId ? (
          <p className="text-center text-muted-foreground text-xs">
            Reference: {results.requestId}
          </p>
        ) : null}
      </section>
    );
  }

  if (results.fares.length === 0) {
    return <NoResultsState />;
  }

  const selectedGroup = groups.find((group) => group.key === selectedOutbound);
  const showingReturns = Boolean(selectedGroup);

  // Round trip drills down: pick the outbound flight, then its returns.
  // One-way has nothing to drill into, so it lists fares directly.
  const rows = selectedGroup
    ? sortFares(selectedGroup.fares, sortKey)
    : sortFares(filtered, sortKey);

  const bestTotal =
    rows.length === 0 ? 0 : Math.min(...rows.map((fare) => fare.adultTotal));
  const bestGroup =
    groups.length === 0
      ? 0
      : Math.min(...groups.map((group) => group.cheapest));
  const listCount =
    isRoundTrip && !showingReturns ? groups.length : rows.length;

  return (
    <section className="flex flex-col gap-4">
      {/* One back control the whole way: returns -> outbound list -> browse.
          Without it a search was a one-way door; the only escape was the reset
          icon buried in the search card, which also wiped the criteria. */}
      <div className="flex flex-col gap-2">
        <Button
          className="-ml-2 self-start text-muted-foreground"
          onClick={
            showingReturns ? () => setSelectedOutbound(null) : backToBrowse
          }
          size="sm"
          type="button"
          variant="ghost"
        >
          <ArrowLeft />
          {showingReturns ? "Outbound flights" : "Back to browse"}
        </Button>

        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold text-lg">
            {showingReturns ? "Choose your return" : results.searchedRoute}
          </h3>
          <p className="text-muted-foreground text-sm">
            {listCount} {countLabel(listCount, showingReturns, isRoundTrip)} ·
            per adult
          </p>
        </div>

        {showingReturns && selectedGroup ? (
          <p className="flex flex-wrap items-center gap-1.5 rounded-xl bg-muted/50 px-3 py-2 text-muted-foreground text-sm">
            <span className="font-medium text-foreground">Outbound picked</span>
            <span aria-hidden="true">·</span>
            {selectedGroup.leg.flightNumbers.join(" · ")}
            <span aria-hidden="true">·</span>
            {selectedGroup.leg.departureTime} → {selectedGroup.leg.arrivalTime}
          </p>
        ) : null}
      </div>

      {showingReturns ? null : (
        <FilterBar
          airlineFilter={airlineFilter}
          availableAirlines={availableAirlines}
          nonStopOnly={nonStopOnly}
          onAirlineChange={setAirlineFilter}
          onSortCycle={() =>
            setSortKey(
              (previous) =>
                SORT_ORDER[
                  (SORT_ORDER.indexOf(previous) + 1) % SORT_ORDER.length
                ] ?? "cheapest"
            )
          }
          onToggleNonStop={() => setNonStopOnly((previous) => !previous)}
          sortKey={sortKey}
        />
      )}

      {rows.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>Nothing matches these filters</EmptyTitle>
            <EmptyDescription>
              Clear a filter to see the other fares.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {isRoundTrip && !showingReturns
            ? groups.map((group) => (
                <OutboundRow
                  group={group}
                  isBest={
                    sortKey === "cheapest" && group.cheapest === bestGroup
                  }
                  key={group.key}
                  onSelect={() => setSelectedOutbound(group.key)}
                />
              ))
            : rows.map((fare) => (
                <FareRow
                  fare={fare}
                  isBest={
                    sortKey === "cheapest" && fare.adultTotal === bestTotal
                  }
                  key={`${fare.routingIdentifier ?? fare.flightNumbers.join("-")}-${fare.adultTotal}`}
                  searchId={results.searchId}
                  showReturn={showingReturns}
                />
              ))}
        </ul>
      )}
    </section>
  );
};
