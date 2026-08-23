"use client";

import { Button } from "@atlas/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@atlas/ui/components/empty";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Compass, Sparkles, TrendingUp } from "lucide-react";

import { useAgentSidebarSync } from "@/hooks/use-agent-panel";
import { trpc } from "@/utils/trpc";

import { useFareSearch } from "./fare-search-context";
import { airportByCode } from "./fares-data";

const cityName = (code: string) => airportByCode.get(code)?.city ?? code;

/**
 * Prompts the agent to do the exploring, which is the one thing this page
 * genuinely cannot: search a spread of dates and destinations at once.
 */
const AgentPrompt = () => {
  const { handOffToAgent } = useAgentSidebarSync();

  return (
    <div className="flex flex-col gap-4 rounded-2xl border bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="flex flex-col gap-0.5">
          <p className="font-medium">Not sure where or when?</p>
          <p className="text-muted-foreground text-sm">
            The agent can search several dates and destinations at once, which
            this form cannot.
          </p>
        </div>
      </div>
      <Button
        onClick={() =>
          handOffToAgent(
            "I'm flexible on dates. Help me find a good-value trip — ask me what I need and search a few options."
          )
        }
        type="button"
        variant="outline"
      >
        Ask the agent
      </Button>
    </div>
  );
};

/**
 * Routes drawn from this traveller's own search history.
 *
 * The previous version listed hand-written deals with invented prices sitting
 * next to live Atlas results, which gave people no way to tell which numbers
 * were real. A search count is a fact; an invented fare is not.
 */
export const PopularRoutes = () => {
  const { runSearch, update } = useFareSearch();
  const { data: routes } = useQuery(trpc.fare.popular.queryOptions());

  const handlePick = (route: NonNullable<typeof routes>[number]) => {
    const origin = airportByCode.get(route.origin) ?? null;
    const destination = airportByCode.get(route.destination) ?? null;

    update({ destination, origin });

    // Dates deliberately left alone: the traveller picked a route, not a trip.
    if (origin && destination) {
      runSearch({ destination, origin });
    }
  };

  return (
    <section className="flex flex-col gap-4">
      <AgentPrompt />

      {routes !== undefined && routes.length > 0 ? (
        <>
          <h3 className="flex items-center gap-2 font-semibold text-lg">
            <TrendingUp className="size-4 text-muted-foreground" />
            Your most searched routes
          </h3>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {routes.map((route) => (
              <Button
                className="h-auto justify-between gap-3 rounded-2xl border px-4 py-3 font-normal"
                key={`${route.origin}-${route.destination}`}
                onClick={() => handlePick(route)}
                type="button"
                variant="outline"
              >
                <span className="flex flex-wrap items-center gap-2 text-left">
                  <span className="font-medium">{cityName(route.origin)}</span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                  <span className="font-medium">
                    {cityName(route.destination)}
                  </span>
                </span>
                <span className="shrink-0 text-muted-foreground text-sm">
                  {route.searches}×
                </span>
              </Button>
            ))}
          </div>
        </>
      ) : null}

      {routes !== undefined && routes.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <Compass />
            </EmptyMedia>
            <EmptyTitle>No searches yet</EmptyTitle>
            <EmptyDescription>
              Pick a route above and search. The ones you use most will show up
              here for one-tap access.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
    </section>
  );
};
