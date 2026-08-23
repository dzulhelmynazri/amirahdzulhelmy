"use client";

import { useQuery } from "@tanstack/react-query";

import { BookingsTable } from "@/components/bookings/bookings-table";
import { trpc } from "@/utils/trpc";

export default function BookingsPage() {
  const { data: bookings = [], isLoading } = useQuery(
    trpc.booking.list.queryOptions()
  );

  return (
    <div className="p-4 sm:p-6">
      <BookingsTable bookings={bookings} loading={isLoading} />
    </div>
  );
}
