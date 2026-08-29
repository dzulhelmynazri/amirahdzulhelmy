"use client";

import { FareIdleState } from "./fare-idle-state";
import { FareSearchProvider } from "./fare-search-context";
import { FareSearchForm } from "./fare-search-form";

/**
 * The idle sections (AI search, recent searches, popular routes) existed but
 * nothing rendered them — the page was only ever the form. They live under
 * it: the form stays the anchor, the shortcuts earn their keep below.
 */
export const FaresCompose = () => (
  <FareSearchProvider source="form">
    <div className="flex flex-1 justify-center py-8">
      <div className="flex w-full max-w-lg flex-col gap-6">
        <FareSearchForm />
        <FareIdleState />
      </div>
    </div>
  </FareSearchProvider>
);
