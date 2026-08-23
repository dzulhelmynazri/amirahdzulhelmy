"use client";

import { useFareSearch } from "./fare-search-context";
import { PopularRoutes } from "./popular-routes";
import { RecentSearches } from "./recent-searches";

/**
 * What the page shows before anything has been searched.
 *
 * Results and idle content are mutually exclusive: once fares are on screen,
 * browsing prompts compete with the thing the traveller asked for. Keeping the
 * switch in one place stops the page from stacking a results section on top of
 * a "start here" section.
 */
export const FareIdleState = () => {
  const { results } = useFareSearch();

  if (results.hasSearched) {
    return null;
  }

  return (
    <>
      <RecentSearches />
      <PopularRoutes />
    </>
  );
};
