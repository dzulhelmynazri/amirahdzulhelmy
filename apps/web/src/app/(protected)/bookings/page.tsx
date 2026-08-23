"use client";

import { useQuery } from "@tanstack/react-query";

import { DataTable } from "@/components/bookings/data-table";
import { DetailsSheet } from "@/components/bookings/details-sheet";
import { trpc } from "@/utils/trpc";

export default function BookingsPage() {
  const { data: bookings = [], isLoading } = useQuery(
    trpc.booking.list.queryOptions()
  );

  return (
    <div className="p-4 sm:p-6">
      <DataTable bookings={bookings} loading={isLoading} />
      <DetailsSheet />
    </div>
  );
}
