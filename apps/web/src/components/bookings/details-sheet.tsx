"use client";

import { Badge } from "@atlas/ui/components/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@atlas/ui/components/sheet";
import { formatCurrency } from "@atlas/utils/currency";
import { formatDate } from "@atlas/utils/date";
import { useQuery } from "@tanstack/react-query";
import { useQueryState } from "nuqs";

import { statusLabels, statusVariants } from "@/types/bookings";
import type { BookingStatus } from "@/types/bookings";
import { trpc } from "@/utils/trpc";

import { CardSkeleton } from "./card-skeleton";
import { Details } from "./details";
import { IncidentsCard } from "./incidents";

const SheetSkeleton = () => (
  <div className="flex flex-col gap-4">
    <CardSkeleton bodyLines={2} />
    <CardSkeleton action bodyLines={4} />
    <CardSkeleton action bodyLines={3} />
    <CardSkeleton bodyLines={3} />
    <CardSkeleton bodyLines={3} />
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
        <div className="flex flex-col gap-4 px-4 pb-4">
          {orderNo ? <IncidentsCard orderNo={orderNo} /> : null}
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
