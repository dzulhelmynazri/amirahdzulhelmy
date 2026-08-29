"use client";

import { Button } from "@atlas/ui/components/button";
import { Input } from "@atlas/ui/components/input";
import { useMutation } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { useState } from "react";

import { trpc } from "@/utils/trpc";

import type { RecentSearch } from "./fare-search-context";
import { useFareSearch } from "./fare-search-context";

/**
 * The AI mode of the fares page: one sentence instead of six fields.
 *
 * A small model turns "KL to Tokyo next Friday, 2 adults" into criteria and
 * the page runs the same search the form would — so the results, history and
 * saved fares all behave identically whichever mode filled them in. Parsing
 * failures surface as one quiet line, never a blocked form.
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
        setError(null);
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
    parse.mutate({ query: trimmed });
  };

  return (
    <div className="flex flex-col gap-2">
      <form
        className="flex items-center gap-2 rounded-2xl border bg-primary/5 p-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Sparkles className="ml-2 size-4 shrink-0 text-primary" />
        <Input
          className="border-0 bg-transparent shadow-none focus-visible:ring-0"
          onChange={(event) => setQuery(event.target.value)}
          placeholder='Try "KL to Tokyo next Friday, 2 adults"'
          value={query}
        />
        <Button
          className="shrink-0 rounded-full"
          disabled={parse.isPending || query.trim().length < 3}
          type="submit"
        >
          {parse.isPending ? "Reading…" : "Search"}
        </Button>
      </form>
      {error && <p className="px-2 text-muted-foreground text-sm">{error}</p>}
    </div>
  );
};
