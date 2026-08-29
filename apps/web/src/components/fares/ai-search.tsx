"use client";

import { Button } from "@atlas/ui/components/button";
import { Input } from "@atlas/ui/components/input";
import { useMutation } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { useState } from "react";

import { trpc } from "@/utils/trpc";

import type { RecentSearch } from "./fare-search-context";
import { useFareSearch } from "./fare-search-context";
import { airportByCode, airports } from "./fares-data";

/** Only real airports; the same file also carries airline codes. */
const AIRPORT_CODES = airports.map((airport) => airport.code);

/**
 * The AI row inside the search card: one sentence instead of six fields.
 *
 * A small model turns "KL to Tokyo next Friday, 2 adults" into criteria and
 * fills the same form the traveller sees — so results, history and saved
 * fares behave identically whichever mode filled them in. Not a <form>:
 * it renders inside the search form, and nested forms are invalid HTML.
 */
export const AiSearch = () => {
  const { applyRecentSearch } = useFareSearch();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const parse = useMutation(
    trpc.fare.parse.mutationOptions({
      onSuccess: (result) => {
        if (!result.criteria) {
          setError(result.error);
          return;
        }
        // The replay path fills the form and runs it, but silently does
        // nothing when a code is not one the picker knows — which reads as a
        // dead button. Check here so there is always a visible outcome.
        const known =
          airportByCode.has(result.criteria.origin) &&
          airportByCode.has(result.criteria.destination);

        if (!known) {
          setError("We do not cover that route yet — try another city.");
          return;
        }

        setError(null);
        setQuery("");
        // Reuses the recent-search replay path so AI criteria go through the
        // exact same fill-and-run behaviour as a clicked history row.
        applyRecentSearch({
          adults: result.criteria.adults,
          cabin: "economy",
          departureDate: result.criteria.departureDate,
          destination: result.criteria.destination,
          origin: result.criteria.origin,
          returnDate: result.criteria.returnDate,
        } as RecentSearch);
      },
    })
  );

  const submit = () => {
    const trimmed = query.trim();
    if (trimmed.length < 3 || parse.isPending) {
      return;
    }
    setError(null);
    parse.mutate({ allowed: AIRPORT_CODES, query: trimmed });
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 rounded-xl bg-muted/50 p-1.5">
        <Sparkles className="ml-2 size-4 shrink-0 text-primary" />
        <Input
          className="h-8 border-0 bg-transparent shadow-none focus-visible:ring-0"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
          placeholder='Ask AI — "KL to Tokyo next Friday, 2 adults"'
          value={query}
        />
        <Button
          className="shrink-0 rounded-lg"
          disabled={parse.isPending || query.trim().length < 3}
          onClick={submit}
          size="sm"
          type="button"
          variant="secondary"
        >
          {parse.isPending ? "Reading…" : "Fill"}
        </Button>
      </div>
      {error && <p className="px-2 text-muted-foreground text-xs">{error}</p>}
    </div>
  );
};
