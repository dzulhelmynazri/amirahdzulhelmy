"use client";

import { useQuery } from "@tanstack/react-query";
import { Suspense } from "react";

import { DataTable } from "@/components/bookings/data-table";
import { DetailsSheet } from "@/components/bookings/details-sheet";
import { trpc } from "@/utils/trpc";

export default function BookingsPage() {
  const { data: bookings = [], isLoading } = useQuery({
    ...trpc.booking.list.queryOptions(),
    /**
     * The agent panel books while this page sits open beside it, and a page
     * that only fetches on mount showed "No bookings yet" seconds after an
     * order was created. Fifteen seconds is fast enough to feel live and slow
     * enough to cost nothing.
     */
    refetchInterval: 15_000,
  });

  return (
    <div className="p-4 sm:p-6">
      <DataTable bookings={bookings} loading={isLoading} />
      {/*
        The sheet reads which booking is open from the query string, which
        cannot be known at prerender. Isolated here so the table still paints
        as static HTML instead of the whole page waiting on the URL.
      */}
      <Suspense fallback={null}>
        <DetailsSheet />
      </Suspense>
    </div>
  );
}
