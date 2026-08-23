"use client";

import { Badge } from "@atlas/ui/components/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@atlas/ui/components/card";
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperTitle,
  StepperTrigger,
} from "@atlas/ui/components/reui/stepper";
import { Separator } from "@atlas/ui/components/separator";
import { formatCurrency } from "@atlas/utils/currency";
import { formatFullDateTime } from "@atlas/utils/date";
import * as countryFlags from "country-flag-icons/react/3x2";
import { ArrowDown, ArrowRight } from "lucide-react";
import { Fragment } from "react";

import {
  getPassengers,
  getSegments,
  getTicketNumbers,
  statusLabels,
} from "@/types/bookings";
import type {
  Booking,
  BookingPassenger,
  BookingSegment,
} from "@/types/bookings";

type FlagComponent = typeof countryFlags.JP;

const countryFlagRegistry: Record<string, FlagComponent> = { ...countryFlags };

const AirportFlag = ({ countryCode }: { countryCode: string }) => {
  const Flag = countryFlagRegistry[countryCode];
  if (!Flag) {
    return null;
  }
  return <Flag className="h-3 w-4.5 rounded-[2px] ring-1 ring-foreground/10" />;
};

const TIMELINE_STEPS = ["created", "confirmed", "issued"] as const;

/** Maps a booking status to the active step; 4 marks every step completed. */
const activeStepFor = (status: string): number => {
  if (status === "confirmed") {
    return 2;
  }
  if (status === "issued") {
    return 3;
  }
  if (status === "refunded" || status === "voided") {
    return 4;
  }
  return 1;
};

const StatusTimeline = ({ status }: { status: string }) => (
  <Stepper className="w-full" value={activeStepFor(status)}>
    <StepperNav className="gap-3">
      {TIMELINE_STEPS.map((step, index) => (
        <StepperItem
          className="relative flex-1 items-start"
          key={step}
          step={index + 1}
        >
          <StepperTrigger className="flex grow flex-col items-start justify-center gap-3.5">
            <StepperIndicator className="h-1 w-full rounded-full bg-border data-[state=active]:bg-primary data-[state=completed]:bg-primary">
              <span className="sr-only">{index + 1}</span>
            </StepperIndicator>
            <StepperTitle className="text-start font-semibold group-data-[state=inactive]/step:text-muted-foreground">
              {statusLabels[step]}
            </StepperTitle>
          </StepperTrigger>
        </StepperItem>
      ))}
    </StepperNav>
  </Stepper>
);

const Dash = () => <span className="text-muted-foreground">—</span>;

const SegmentRow = ({ segment }: { segment: BookingSegment }) => (
  <div className="flex flex-col gap-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1.5 font-medium">
        <AirportFlag countryCode={segment.origin.country} />
        {segment.origin.code}
        <ArrowRight className="size-3 text-muted-foreground" />
        {segment.destination.code}
        <AirportFlag countryCode={segment.destination.country} />
      </span>
      <Badge variant="outline">
        {segment.airline} · {segment.flightNumber || "—"}
      </Badge>
    </div>
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      <div className="flex flex-col">
        <span className="text-muted-foreground">
          {segment.origin.city} ({segment.origin.code})
        </span>
        <span className="font-medium">
          {segment.departure ? formatFullDateTime(segment.departure) : "—"}
        </span>
      </div>
      <ArrowDown className="size-3.5 rotate-[-90deg] text-muted-foreground" />
      <div className="flex flex-col">
        <span className="text-muted-foreground">
          {segment.destination.city} ({segment.destination.code})
        </span>
        <span className="font-medium">
          {segment.arrival ? formatFullDateTime(segment.arrival) : "—"}
        </span>
      </div>
    </div>
  </div>
);

const FlightsCard = ({ segments }: { segments: BookingSegment[] }) => {
  const [first] = segments;
  const description =
    segments.length > 0
      ? `${segments.length} ${segments.length === 1 ? "segment" : "segments"} · ${first?.airline ?? "Unknown airline"}`
      : "No flight details in the order snapshot.";
  return (
    <Card>
      <CardHeader>
        <CardTitle>Flights</CardTitle>
        <CardAction>{description}</CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {segments.length === 0 && <Dash />}
        {segments.map((segment, index) => (
          <Fragment key={`${segment.flightNumber}-${segment.departure}`}>
            {index > 0 ? <Separator /> : null}
            <SegmentRow segment={segment} />
          </Fragment>
        ))}
      </CardContent>
    </Card>
  );
};

const PassengersCard = ({ passengers }: { passengers: BookingPassenger[] }) => (
  <Card>
    <CardHeader>
      <CardTitle>Passengers</CardTitle>
    </CardHeader>
    <CardContent className="flex flex-col gap-2">
      {passengers.length === 0 && <Dash />}
      {passengers.map((passenger) => (
        <div
          key={passenger.name}
          className="flex items-center justify-between gap-2 text-sm"
        >
          <span>{passenger.name}</span>
          <Badge className="capitalize" variant="outline">
            {passenger.type}
          </Badge>
        </div>
      ))}
    </CardContent>
  </Card>
);

const TicketingCard = ({
  booking,
  ticketNumbers,
}: {
  booking: Booking;
  ticketNumbers: string[];
}) => (
  <Card>
    <CardHeader>
      <CardTitle>Ticketing</CardTitle>
    </CardHeader>
    <CardContent className="flex flex-col gap-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">PNR</span>
        {booking.pnr ? (
          <span className="font-mono">{booking.pnr}</span>
        ) : (
          <Dash />
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Ticket numbers</span>
        {ticketNumbers.length > 0 ? (
          <span className="flex flex-col items-end font-mono">
            {ticketNumbers.map((ticket) => (
              <span key={ticket}>{ticket}</span>
            ))}
          </span>
        ) : (
          <Dash />
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Total</span>
        <span className="font-medium">
          {booking.totalAmount
            ? formatCurrency(Number(booking.totalAmount), booking.currency)
            : "—"}
        </span>
      </div>
    </CardContent>
  </Card>
);

export const Details = ({
  booking,
  live,
}: {
  booking: Booking;
  live: Record<string, unknown> | null;
}) => {
  const segments = getSegments(booking.payload);
  const passengers = getPassengers(booking.payload);
  const ticketNumbers = getTicketNumbers(live);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Order progress</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusTimeline status={booking.status} />
        </CardContent>
      </Card>

      <FlightsCard segments={segments} />
      <PassengersCard passengers={passengers} />
      <TicketingCard booking={booking} ticketNumbers={ticketNumbers} />
    </div>
  );
};
