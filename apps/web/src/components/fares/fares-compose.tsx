"use client";

import { FareSearchProvider } from "./fare-search-context";
import { FareSearchForm } from "./fare-search-form";

/**
 * Just the form, centered. A stacked pile of shortcut cards under it was
 * tried and read as clutter — the AI entry lives inside the search card
 * instead, so the page keeps a single anchor.
 */
export const FaresCompose = () => (
  <FareSearchProvider source="form">
    <div className="flex flex-1 items-center justify-center">
      <div className="w-full max-w-lg">
        <FareSearchForm />
      </div>
    </div>
  </FareSearchProvider>
);
