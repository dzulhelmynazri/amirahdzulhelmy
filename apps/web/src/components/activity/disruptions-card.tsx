"use client";

import { Badge } from "@atlas/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@atlas/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { PlaneTakeoff } from "lucide-react";
import Link from "next/link";

import { trpc } from "@/utils/trpc";

/**
 * Disruptions Atlas pushed about this traveller's own orders.
 *
 * The card exists because these findings used to go nowhere a traveller could
 * see them: the daily sweep emailed one ops inbox and wrote nothing down. A
 * schedule change on your own flight belongs on your own screen.
 *
 * Rows appear the moment the webhook lands, before any model has run — so a
 * blank `handledNote` means "recorded, not yet explained", which is honest
 * rather than empty.
 */
export const DisruptionsCard = () => {
  const { data: rows = [] } = useQuery({
    ...trpc.activity.disruptions.queryOptions(),
    // Pushes arrive while this page sits open; without a refetch the board is
    // only as current as the last navigation.
    refetchInterval: 20_000,
  });

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlaneTakeoff className="size-4 text-muted-foreground" />
          Your flight disruptions
        </CardTitle>
        <CardDescription>
          Schedule changes and cancellations Atlas pushed for your bookings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nothing disrupted. Atlas pushes here the moment an airline reports a
            change on one of your orders.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((row) => (
              <li className="flex flex-col gap-1" key={row.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    className="font-medium underline-offset-4 hover:underline"
                    href={`/bookings?order=${row.orderNo}`}
                  >
                    {row.orderNo}
                  </Link>
                  {row.airline && (
                    <span className="text-muted-foreground text-sm">
                      {row.airline}
                    </span>
                  )}
                  <Badge
                    variant={
                      row.status === "received" ? "outline" : "secondary"
                    }
                  >
                    {row.status === "received" ? "New" : "Reviewed"}
                  </Badge>
                </div>
                <p className="text-sm">{row.summary}</p>
                {row.handledNote && (
                  <p className="text-muted-foreground text-sm">
                    {row.handledNote}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
