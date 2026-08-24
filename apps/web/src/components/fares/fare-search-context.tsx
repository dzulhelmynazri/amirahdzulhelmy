"use client";

import type { AppRouter } from "@atlas/api/routers/index";
import type { NormalizedFare } from "@atlas/atlas-client/fare-compare/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { useRouter } from "next/navigation";
import { useQueryStates } from "nuqs";
import type { inferParserType } from "nuqs";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import { trpc } from "@/utils/trpc";

import {
  FARE_SEARCH_PATH,
  fareSearchParams,
  parseLocalDate,
  serializeFareSearch,
  toIsoDate,
} from "./fare-search-params";
import {
  airportByCode,
  displayCurrency,
  maxPassengers,
  minPassengers,
} from "./fares-data";
import type { Airport, CabinClass, FareDeal, TripType } from "./fares-data";

/**
 * Holds the fare search criteria so the search form and the deal cards can
 * share it. On `/fares` the form is local; submitting navigates to
 * `/fares/search` with nuqs params. That page hydrates from the URL and fetches.
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
  /** Leaves results and returns to the compose form on `/fares`. */
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

const clampPassengers = (value: number) =>
  Math.min(maxPassengers, Math.max(minPassengers, value));

const isSearchComplete = (search: FareSearch) =>
  Boolean(
    search.origin &&
    search.destination &&
    search.departure &&
    (search.tripType !== "round-trip" || search.returnDate)
  );

type FareSearchParams = inferParserType<typeof fareSearchParams>;

const searchFromParams = (params: FareSearchParams): FareSearch => ({
  cabin: params.cabin,
  departure: params.departure ?? undefined,
  destination: params.destination
    ? (airportByCode.get(params.destination) ?? null)
    : null,
  origin: params.origin ? (airportByCode.get(params.origin) ?? null) : null,
  passengers: clampPassengers(params.adults),
  returnDate: params.returnDate ?? undefined,
  tripType: params.trip,
});

const paramsFromSearch = (search: FareSearch): FareSearchParams => ({
  adults: search.passengers,
  cabin: search.cabin,
  departure: search.departure ?? null,
  destination: search.destination?.code ?? null,
  origin: search.origin?.code ?? null,
  returnDate:
    search.tripType === "round-trip" ? (search.returnDate ?? null) : null,
  trip: search.tripType,
});

const resultsFromOutcome = (
  searchedRoute: string,
  outcome: {
    error?: string;
    fares: NormalizedFare[];
    nearbyDates?: string[];
    noResultMessage?: string;
    requestId?: string;
    searchId?: string;
  }
): FareResultsState => ({
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
  ...(outcome.requestId === undefined ? {} : { requestId: outcome.requestId }),
  ...(outcome.searchId === undefined ? {} : { searchId: outcome.searchId }),
});

export const FareSearchProvider = ({
  children,
  source,
}: {
  children: ReactNode;
  /** `form` is `/fares`; `url` is `/fares/search`. */
  source: "form" | "url";
}) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [urlParams, setUrlParams] = useQueryStates(fareSearchParams, {
    history: "push",
  });
  const committed = searchFromParams(urlParams);
  const urlKey = serializeFareSearch(urlParams);

  const [formSearch, setFormSearch] = useState(defaultSearch);
  const [urlDraft, setUrlDraft] = useState<FareSearch | null>(null);
  const [seenUrlKey, setSeenUrlKey] = useState(urlKey);

  if (source === "url" && seenUrlKey !== urlKey) {
    setSeenUrlKey(urlKey);
    setUrlDraft(null);
  }

  const search = source === "url" ? (urlDraft ?? committed) : formSearch;

  const [results, setResults] = useState<FareResultsState>(() =>
    source === "url" ? { fares: [], hasSearched: true } : defaultResults
  );
  const [fetchedKey, setFetchedKey] = useState<string | null>(null);

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

  const update = useCallback(
    (patch: Partial<FareSearch>) => {
      if (source === "url") {
        setUrlDraft((previous) => ({
          ...(previous ?? committed),
          ...patch,
        }));
        return;
      }

      setFormSearch((previous) => ({ ...previous, ...patch }));
    },
    [committed, source]
  );

  const swapAirports = useCallback(() => {
    update({ destination: search.origin, origin: search.destination });
  }, [search.destination, search.origin, update]);

  const applyDeal = useCallback(
    (deal: FareDeal) => {
      update({
        departure: parseLocalDate(deal.departureDate) ?? undefined,
        destination: airportByCode.get(deal.destinationCode) ?? null,
        origin: airportByCode.get(deal.originCode) ?? null,
        returnDate: parseLocalDate(deal.returnDate) ?? undefined,
        tripType: "round-trip",
      });
    },
    [update]
  );

  const reset = useCallback(() => {
    if (source === "url") {
      router.push("/fares");
      return;
    }

    setFormSearch(defaultSearch);
    setResults(defaultResults);
  }, [router, source]);

  const backToBrowse = useCallback(() => {
    router.push("/fares");
  }, [router]);

  const commitSearch = useCallback(
    (criteria: FareSearch) => {
      if (!isSearchComplete(criteria)) {
        return;
      }

      const params = paramsFromSearch(criteria);

      if (source === "form") {
        router.push(serializeFareSearch(FARE_SEARCH_PATH, params));
        return;
      }

      setUrlDraft(null);
      void setUrlParams(params);
    },
    [router, setUrlParams, source]
  );

  const runSearch = useCallback(
    (overrides?: Partial<FareSearch>) => {
      commitSearch({ ...search, ...overrides });
    },
    [commitSearch, search]
  );

  /**
   * Searching a suggested date passes the change as an override rather than
   * setting state and waiting a render — no effect, no cascading re-render.
   */
  const searchOnDate = useCallback(
    (isoDate: string) => {
      const departure = parseLocalDate(isoDate) ?? undefined;
      commitSearch({
        ...search,
        departure,
        returnDate: undefined,
        tripType: "one-way",
      });
    },
    [commitSearch, search]
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
      commitSearch({
        cabin: (recent.cabin as CabinClass) ?? "economy",
        departure: parseLocalDate(recent.departureDate) ?? undefined,
        destination: airportByCode.get(recent.destination) ?? null,
        origin: airportByCode.get(recent.origin) ?? null,
        passengers: recent.adults,
        returnDate:
          recent.returnDate === null
            ? undefined
            : (parseLocalDate(recent.returnDate) ?? undefined),
        tripType: recent.returnDate === null ? "one-way" : "round-trip",
      });
    },
    [commitSearch]
  );

  useEffect(() => {
    if (source !== "url") {
      return;
    }

    const criteria = searchFromParams(urlParams);
    const { cabin, departure, destination, origin, passengers, returnDate } =
      criteria;

    if (!(origin && destination && departure) || !isSearchComplete(criteria)) {
      router.replace("/fares");
      return;
    }

    const searchedRoute = `${origin.city} → ${destination.city}`;
    const requestKey = urlKey;
    let cancelled = false;

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

        if (cancelled) {
          return;
        }

        setResults(resultsFromOutcome(searchedRoute, outcome));
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }

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
        if (!cancelled) {
          setFetchedKey(requestKey);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mutateAsync, router, source, urlKey, urlParams]);

  const value = useMemo<FareSearchContextValue>(
    () => ({
      applyDeal,
      applyRecentSearch,
      backToBrowse,
      blockingFields,
      isSearching: source === "url" && fetchedKey !== urlKey,
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
      fetchedKey,
      reset,
      results,
      runSearch,
      search,
      searchOnDate,
      source,
      swapAirports,
      update,
      urlKey,
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
