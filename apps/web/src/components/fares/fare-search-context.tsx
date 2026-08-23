"use client";

import type { AppRouter } from "@atlas/api/routers/index";
import type { NormalizedFare } from "@atlas/atlas-client/fare-compare/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { createContext, use, useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { trpc } from "@/utils/trpc";

import { airportByCode, displayCurrency, minPassengers } from "./fares-data";
import type { Airport, CabinClass, FareDeal, TripType } from "./fares-data";

/**
 * Holds the fare search criteria so the search form and the deal cards can
 * share it: picking a deal fills the form in above rather than navigating
 * away, which is the only sensible affordance until fare results exist.
 */
export interface FareSearch {
  cabin: CabinClass;
  departure: Date | undefined;
  destination: Airport | null;
  origin: Airport | null;
  passengers: number;
  returnDate: Date | undefined;
  tripType: TripType;
}

export interface FareResultsState {
  error?: string;
  fares: NormalizedFare[];
  /** True once a search has run, so the empty state can differ from "idle". */
  hasSearched: boolean;
  /** Nearby dates that do have flights, offered as one-tap retries. */
  nearbyDates?: string[];
  noResultMessage?: string;
  requestId?: string;
  /** Row id in `fare_search`, so a saved fare can point back at the search. */
  searchId?: string;
  /** Criteria the returned fares belong to, for the results heading. */
  searchedRoute?: string;
}

export type RecentSearch =
  inferRouterOutputs<AppRouter>["fare"]["recent"][number];

interface FareSearchContextValue {
  applyDeal: (deal: FareDeal) => void;
  /** Refills the form from a past search and runs it. */
  applyRecentSearch: (recent: RecentSearch) => void;
  /** Drops the results and returns to the browse view, keeping the criteria. */
  backToBrowse: () => void;
  /** Names the fields still blocking a search, for the button hint. */
  blockingFields: string[];
  isSearching: boolean;
  /** Re-runs the search on a suggested date. */
  searchOnDate: (isoDate: string) => void;
  reset: () => void;
  results: FareResultsState;
  /** Overrides let a caller search criteria it just set, without a render. */
  runSearch: (overrides?: Partial<FareSearch>) => void;
  search: FareSearch;
  swapAirports: () => void;
  update: (patch: Partial<FareSearch>) => void;
}

const defaultSearch: FareSearch = {
  cabin: "economy",
  departure: undefined,
  destination: null,
  origin: null,
  passengers: minPassengers,
  returnDate: undefined,
  tripType: "round-trip",
};

const defaultResults: FareResultsState = { fares: [], hasSearched: false };

const FareSearchContext = createContext<FareSearchContextValue | null>(null);

/** Atlas wants `YYYY-MM-DD` here; the router compacts it to `YYYYMMDD`. */
const toIsoDate = (date: Date) => {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

/** Parses an ISO `YYYY-MM-DD` string as a local-midnight date. */
const parseDealDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const FareSearchProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState<FareSearch>(defaultSearch);
  const [results, setResults] = useState<FareResultsState>(defaultResults);
  const [isSearching, setIsSearching] = useState(false);

  const { mutateAsync } = useMutation(
    trpc.fare.search.mutationOptions({
      onSuccess: (outcome) => {
        if (outcome.error) {
          return;
        }

        void queryClient.invalidateQueries(trpc.fare.recent.queryFilter());
        void queryClient.invalidateQueries(trpc.fare.popular.queryFilter());
      },
    })
  );

  const update = useCallback((patch: Partial<FareSearch>) => {
    setSearch((previous) => ({ ...previous, ...patch }));
  }, []);

  const swapAirports = useCallback(() => {
    setSearch((previous) => ({
      ...previous,
      destination: previous.origin,
      origin: previous.destination,
    }));
  }, []);

  const applyDeal = useCallback((deal: FareDeal) => {
    setSearch((previous) => ({
      ...previous,
      departure: parseDealDate(deal.departureDate),
      destination: airportByCode.get(deal.destinationCode) ?? null,
      origin: airportByCode.get(deal.originCode) ?? null,
      returnDate: parseDealDate(deal.returnDate),
      tripType: "round-trip",
    }));
  }, []);

  const reset = useCallback(() => {
    setSearch(defaultSearch);
    setResults(defaultResults);
  }, []);

  // Distinct from reset: the criteria stay in the form so the traveller can
  // tweak one field and search again, but the page returns to browse.
  const backToBrowse = useCallback(() => {
    setResults(defaultResults);
  }, []);

  const runSearch = useCallback(
    (overrides?: Partial<FareSearch>) => {
      const criteria = { ...search, ...overrides };
      const { cabin, departure, destination, origin, passengers, returnDate } =
        criteria;

      if (!(origin && destination && departure)) {
        return;
      }

      const searchedRoute = `${origin.city} → ${destination.city}`;

      setIsSearching(true);

      void (async () => {
        try {
          const outcome = await mutateAsync({
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

          setResults({
            fares: outcome.fares,
            hasSearched: true,
            searchedRoute,
            ...(outcome.error === undefined ? {} : { error: outcome.error }),
            ...(outcome.nearbyDates === undefined
              ? {}
              : { nearbyDates: outcome.nearbyDates }),
            ...(outcome.noResultMessage === undefined
              ? {}
              : { noResultMessage: outcome.noResultMessage }),
            ...(outcome.requestId === undefined
              ? {}
              : { requestId: outcome.requestId }),
            ...(outcome.searchId === undefined
              ? {}
              : { searchId: outcome.searchId }),
          });
        } catch (error: unknown) {
          setResults({
            error:
              error instanceof Error
                ? error.message
                : "We could not fetch fares right now. Please try again.",
            fares: [],
            hasSearched: true,
            searchedRoute,
          });
        } finally {
          setIsSearching(false);
        }
      })();
    },
    [mutateAsync, search]
  );

  /**
   * Searching a suggested date passes the change as an override rather than
   * setting state and waiting a render — no effect, no cascading re-render.
   */
  const searchOnDate = useCallback(
    (isoDate: string) => {
      const departure = parseDealDate(isoDate);
      setSearch((previous) => ({
        ...previous,
        departure,
        returnDate: undefined,
        tripType: "one-way",
      }));
      runSearch({ departure, returnDate: undefined, tripType: "one-way" });
    },
    [runSearch]
  );

  // Named so the CTA can say what is missing instead of just being disabled.
  const blockingFields = useMemo(() => {
    const missing: string[] = [];
    if (!search.origin) {
      missing.push("origin");
    }
    if (!search.destination) {
      missing.push("destination");
    }
    if (!search.departure) {
      missing.push("departure date");
    }
    if (search.tripType === "round-trip" && !search.returnDate) {
      missing.push("return date");
    }
    return missing;
  }, [search]);

  const applyRecentSearch = useCallback(
    (recent: RecentSearch) => {
      const criteria: Partial<FareSearch> = {
        cabin: (recent.cabin as CabinClass) ?? "economy",
        departure: parseDealDate(recent.departureDate),
        destination: airportByCode.get(recent.destination) ?? null,
        origin: airportByCode.get(recent.origin) ?? null,
        passengers: recent.adults,
        returnDate:
          recent.returnDate === null
            ? undefined
            : parseDealDate(recent.returnDate),
        tripType: recent.returnDate === null ? "one-way" : "round-trip",
      };

      setSearch((previous) => ({ ...previous, ...criteria }));
      runSearch(criteria);
    },
    [runSearch]
  );

  const value = useMemo<FareSearchContextValue>(
    () => ({
      applyDeal,
      applyRecentSearch,
      backToBrowse,
      blockingFields,
      isSearching,
      reset,
      results,
      runSearch,
      search,
      searchOnDate,
      swapAirports,
      update,
    }),
    [
      applyDeal,
      applyRecentSearch,
      backToBrowse,
      blockingFields,
      isSearching,
      reset,
      results,
      runSearch,
      search,
      searchOnDate,
      swapAirports,
      update,
    ]
  );

  return <FareSearchContext value={value}>{children}</FareSearchContext>;
};

export const useFareSearch = (): FareSearchContextValue => {
  const context = use(FareSearchContext);

  if (!context) {
    throw new Error("useFareSearch must be used within a FareSearchProvider.");
  }

  return context;
};
