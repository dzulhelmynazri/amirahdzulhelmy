"use client";

import { Badge } from "@atlas/ui/components/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@atlas/ui/components/card";
import { Separator } from "@atlas/ui/components/separator";
import { formatDateTime } from "@atlas/utils/date";
import { useQuery } from "@tanstack/react-query";
import { Fragment } from "react";

import type { BookingIncident } from "@/types/bookings";
import { trpc } from "@/utils/trpc";

import { CardSkeleton } from "./card-skeleton";

const separatorPattern = /[_-]+/gu;
const camelBoundaryPattern = /[a-z\d][A-Z]/gu;

/** Turns an Atlas eventType code such as "FLIGHT_CANCELLED" into "Flight cancelled". */
const incidentTypeLabel = (eventType: string): string => {
  const spaced = eventType
    .replaceAll(separatorPattern, " ")
    .replaceAll(
      camelBoundaryPattern,
      (match) => `${match.charAt(0)} ${match.charAt(1)}`
    )
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

const summarize = (
  incidents: BookingIncident[],
  incidentsError: string | null
): string => {
  if (incidentsError) {
    return "Disruption Guard · unavailable";
  }
  const noun = incidents.length === 1 ? "event" : "events";
  return `Disruption Guard · ${incidents.length} ${noun}`;
};

export const IncidentsCard = ({ orderNo }: { orderNo: string }) => {
  const { data, isLoading } = useQuery(
    trpc.booking.incidents.queryOptions({ orderNo })
  );

  if (isLoading) {
    return <CardSkeleton action />;
  }

  const incidents = data?.incidents ?? [];
  const incidentsError = data?.incidentsError ?? null;

  const renderBody = () => {
    if (incidents.length === 0) {
      return (
        <p className="text-muted-foreground text-sm">
          {incidentsError
            ? "Disruption monitoring is unavailable right now."
            : "No disruption events recorded for this booking."}
        </p>
      );
    }
    return incidents.map((incident, index) => (
      <Fragment key={incident.eventId}>
        {index > 0 ? <Separator /> : null}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="destructive">
              {incidentTypeLabel(incident.eventType)}
            </Badge>
            <span className="text-muted-foreground text-xs tabular-nums">
              {incident.eventTime ? formatDateTime(incident.eventTime) : "—"}
            </span>
          </div>
          {incident.extraInfo ? (
            <p className="text-muted-foreground text-sm">
              {incident.extraInfo}
            </p>
          ) : null}
        </div>
      </Fragment>
    ));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Incidents</CardTitle>
        <CardAction>{summarize(incidents, incidentsError)}</CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">{renderBody()}</CardContent>
    </Card>
  );
};
