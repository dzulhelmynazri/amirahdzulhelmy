"use client";

import { createContext, use, useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { airportByCode, minPassengers } from "./fares-data";
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

interface FareSearchContextValue {
  applyDeal: (deal: FareDeal) => void;
  reset: () => void;
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

const FareSearchContext = createContext<FareSearchContextValue | null>(null);

/** Parses an ISO `YYYY-MM-DD` string as a local-midnight date. */
const parseDealDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const FareSearchProvider = ({ children }: { children: ReactNode }) => {
  const [search, setSearch] = useState<FareSearch>(defaultSearch);

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
  }, []);

  const value = useMemo<FareSearchContextValue>(
    () => ({ applyDeal, reset, search, swapAirports, update }),
    [applyDeal, reset, search, swapAirports, update]
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
