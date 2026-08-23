"use client";

import { Badge } from "@atlas/ui/components/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@atlas/ui/components/sheet";
import { Skeleton } from "@atlas/ui/components/skeleton";
import { formatCurrency } from "@atlas/utils/currency";
import { formatDate } from "@atlas/utils/date";
import { useQuery } from "@tanstack/react-query";
import { useQueryState } from "nuqs";

import { statusLabels, statusVariants } from "@/types/bookings";
import type { BookingStatus } from "@/types/bookings";
import { trpc } from "@/utils/trpc";

import { Details } from "./details";

const SheetSkeleton = () => (
  <div className="flex flex-col gap-4">
    <Skeleton className="h-24 w-full rounded-lg" />
    <Skeleton className="h-48 w-full rounded-lg" />
    <Skeleton className="h-32 w-full rounded-lg" />
    <Skeleton className="h-32 w-full rounded-lg" />
  </div>
);

export const DetailsSheet = () => {
  const [orderNo, setOrderNo] = useQueryState("booking");
  const { data, isLoading } = useQuery(
    trpc.booking.details.queryOptions(
      { orderNo: orderNo ?? "" },
      { enabled: orderNo !== null }
    )
  );

  const booking = data?.booking;
  const status = booking?.status as BookingStatus | undefined;

  return (
    <Sheet
      onOpenChange={(open) => {
        if (!open) {
          void setOrderNo(null);
        }
      }}
      open={orderNo !== null}
    >
      <SheetContent
        showCloseButton={false}
        className="data-[side=right]:sm:max-w-3xl overflow-y-auto data-[side=right]:inset-y-4 data-[side=right]:right-4 data-[side=right]:h-auto data-[side=right]:rounded-2xl data-[side=right]:border data-[side=right]:shadow-2xl"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 pr-10">
            {orderNo}
            {status && (
              <Badge variant={statusVariants[status] ?? "outline"}>
                {statusLabels[status] ?? status}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            {booking
              ? `Booked on ${formatDate(booking.createdAt)}${booking.pnr ? ` · PNR ${booking.pnr}` : ""}${booking.totalAmount ? ` · ${formatCurrency(Number(booking.totalAmount), booking.currency)}` : ""}`
              : "Loading booking details..."}
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">
          {isLoading || !data ? (
            <SheetSkeleton />
          ) : (
            <Details booking={data.booking} live={data.live} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
