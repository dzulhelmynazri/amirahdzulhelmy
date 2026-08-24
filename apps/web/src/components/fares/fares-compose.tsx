"use client";

import { FareSearchProvider } from "./fare-search-context";
import { FareSearchForm } from "./fare-search-form";

export const FaresCompose = () => (
  <FareSearchProvider source="form">
    <div className="flex flex-1 items-center justify-center">
      <div className="w-full max-w-lg">
        <FareSearchForm />
      </div>
    </div>
  </FareSearchProvider>
);
