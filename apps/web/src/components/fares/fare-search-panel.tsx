"use client";

import { useState } from "react";

import { FareSearchBar, useIsSearchCollapsible } from "./fare-search-bar";
import { useFareSearch } from "./fare-search-context";
import { FareSearchForm } from "./fare-search-form";

/**
 * Decides whether the search shows as a full card or a summary bar.
 *
 * Collapsed by default once results exist — and while a search is in flight —
 * because the form is finished work occupying the top of the page. Expanding
 * is a deliberate act ("Edit"), and running a new search folds it away again.
 */
export const FareSearchPanel = () => {
  const { isSearching, search } = useFareSearch();
  const collapsible = useIsSearchCollapsible();
  const [isEditing, setIsEditing] = useState(false);

  const showBar =
    !isEditing &&
    (collapsible ||
      (isSearching && Boolean(search.origin && search.destination)));

  if (showBar) {
    return <FareSearchBar onEdit={() => setIsEditing(true)} />;
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <FareSearchForm onSearched={() => setIsEditing(false)} />
    </div>
  );
};
