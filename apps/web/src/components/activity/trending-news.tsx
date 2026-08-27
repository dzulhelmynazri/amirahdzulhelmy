"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@atlas/ui/components/card";
import { Skeleton } from "@atlas/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";

import { trpc } from "@/utils/trpc";

const SKELETON_ROWS = ["a", "b", "c"];

/** `3h ago` while it is fresh, a date once it stops being news. */
const formatWhen = (iso: string): string => {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60_000);

  if (minutes < 60) {
    return `${Math.max(minutes, 1)}m ago`;
  }

  return `${Math.round(minutes / 60)}h ago`;
};

/**
 * World disruption headlines, kept apart from the alert board.
 *
 * The board above answers "does this affect a trip I have". This answers "what
 * is happening", which is a different question with a different answer for
 * everyone reading it. Folding the two together would mean a row about Nepal
 * appearing for someone flying to Singapore, and after a few of those nobody
 * reads either.
 *
 * Nothing here is written by a model: these are articles that were published,
 * with the outlet named and a link to go and read it.
 */
export const TrendingNews = () => {
  const { data, isLoading } = useQuery(trpc.news.trending.queryOptions());

  return (
    <Card>
      <CardHeader>
        <CardTitle>Disruption headlines</CardTitle>
        <CardDescription>
          Cancellations, closures and airspace events reported worldwide in the
          last 24 hours. Not specific to your trips.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {SKELETON_ROWS.map((row) => (
              <Skeleton className="h-10 rounded-lg" key={row} />
            ))}
          </div>
        ) : null}

        {/*
          An unreachable source is said out loud. Showing it as an empty feed
          would claim nothing is happening, which a failed request cannot know.
        */}
        {data && !data.reachable ? (
          <p className="text-muted-foreground text-sm">
            The news index could not be reached, so this is not a claim that
            nothing happened.
          </p>
        ) : null}

        {data?.reachable && data.items.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nothing reported in the last 24 hours.
          </p>
        ) : null}

        <ul className="flex flex-col">
          {data?.items.map((item) => (
            <li key={item.url}>
              <a
                className="-mx-2 flex items-start gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50"
                href={item.url}
                rel="noopener noreferrer"
                target="_blank"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="line-clamp-2 text-sm">{item.title}</span>
                  <span className="text-muted-foreground text-xs">
                    {item.outlet} · {formatWhen(item.publishedAt)}
                  </span>
                </span>
                <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              </a>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
