"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@atlas/ui/components/alert-dialog";
import { Badge } from "@atlas/ui/components/badge";
import { Button } from "@atlas/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@atlas/ui/components/empty";
import { Skeleton } from "@atlas/ui/components/skeleton";
import {
  Pencil,
  Trash2,
  TriangleAlert,
  UserPlus,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { listTravellers, removeTraveller } from "@/app/actions/travellers";
import { findCountry, parseAtlasPhone } from "@/lib/countries";

type TravellerRow = Awaited<ReturnType<typeof listTravellers>>[number];

const SKELETON_ROWS = ["a", "b"];

/**
 * `1999-05-11` reads as data; `11 May 1999` reads as a birthday. Parsed as
 * local Y/M/D rather than `new Date(iso)`, which is UTC and lands a day early
 * west of Greenwich.
 */
const formatDate = (iso: string): string => {
  const [year, month, day] = iso.split("-").map(Number);

  if (!(year && month && day)) {
    return iso;
  }

  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const GENDER_LABELS: Record<string, string> = { F: "Female", M: "Male" };

/** Everything about a traveller that fits on one line under their name. */
const summarise = (row: TravellerRow): string => {
  const country = row.nationality ? findCountry(row.nationality) : undefined;

  return [
    formatDate(row.birthday),
    GENDER_LABELS[row.gender] ?? row.gender,
    country ? `${country.flag} ${country.name}` : row.nationality,
  ]
    .filter(Boolean)
    .join(" · ");
};

const formatPhone = (phone: string): string => {
  const parts = parseAtlasPhone(phone);

  return parts ? `+${parts.callingCode} ${parts.local}` : phone;
};

const TravellerRowItem = ({
  onRemoved,
  row,
}: {
  onRemoved: (id: string) => void;
  row: TravellerRow;
}) => {
  const [isRemoving, startRemoving] = useTransition();

  const handleRemove = () => {
    startRemoving(async () => {
      const result = await removeTraveller(row.id);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      onRemoved(row.id);
    });
  };

  const contact = [row.email, row.phone ? formatPhone(row.phone) : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="rounded-xl border transition-colors hover:bg-accent/40">
      <div className="flex items-start gap-3 p-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium">{row.name}</span>
            {row.isPrimary ? <Badge variant="secondary">Default</Badge> : null}
          </span>

          <span className="text-muted-foreground text-sm">
            {summarise(row)}
          </span>

          {contact ? (
            <span className="text-muted-foreground text-sm">{contact}</span>
          ) : null}

          {/*
            Called out rather than left to a dash: a passport is the one thing
            that stops an international booking at the counter, and its absence
            is easy to miss in a row of grey text.
          */}
          {row.documentNumber ? (
            <span className="text-muted-foreground text-sm">
              Passport {row.documentNumber}
              {row.documentExpiry
                ? ` · expires ${formatDate(row.documentExpiry)}`
                : ""}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-600 text-sm dark:text-amber-500">
              <TriangleAlert className="size-3.5 shrink-0" />
              No passport saved — needed to fly internationally
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            aria-label={`Edit ${row.name}`}
            // It renders an anchor, so it must not claim native button semantics.
            nativeButton={false}
            render={<Link href={`/profile/${row.id}`} />}
            size="icon-sm"
            variant="ghost"
          >
            <Pencil />
          </Button>
          {/*
            Confirmed, because this sits one tap from Edit and takes a
            passport number with it. There is no undo and nothing to restore
            from.
          */}
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  aria-label={`Remove ${row.name}`}
                  disabled={isRemoving}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 />
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove {row.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Their date of birth
                  {row.documentNumber ? ", passport number" : ""} and contact
                  details are deleted. Bookings already made are not affected.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep</AlertDialogCancel>
                <AlertDialogAction onClick={handleRemove}>
                  Remove traveller
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </li>
  );
};

/**
 * Traveller profiles live here rather than in agent memory: these are exact,
 * legally significant fields the traveller must be able to see and correct.
 * A misspelt name is a denied boarding; a passport number in an opaque recall
 * store is a privacy question nobody asked for.
 *
 * Editing happens on its own route, `/profile/[id]`, so a half-filled form
 * survives a refresh and can be linked to.
 */
export const Travellers = () => {
  const [rows, setRows] = useState<TravellerRow[] | null>(null);

  useEffect(() => {
    let active = true;

    const initial = async () => {
      const result = await listTravellers();
      if (active) {
        setRows(result);
      }
    };

    void initial();

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="font-semibold text-2xl tracking-tight">Travellers</h2>
          <p className="max-w-prose text-muted-foreground text-sm">
            The people you book for. Saved here so nobody retypes a passport
            number, and so you can check it before a ticket is issued.
          </p>
        </div>

        {rows && rows.length > 0 ? (
          <Button
            nativeButton={false}
            render={<Link href="/profile/new" />}
            size="sm"
            variant="outline"
          >
            <UserPlus />
            Add traveller
          </Button>
        ) : null}
      </div>

      {rows === null ? (
        <div className="flex flex-col gap-2">
          {SKELETON_ROWS.map((row) => (
            <Skeleton className="h-24 rounded-xl" key={row} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia>
                  <UserRound />
                </EmptyMedia>
                <EmptyTitle>No travellers yet</EmptyTitle>
                <EmptyDescription>
                  Add yourself first. The agent will stop asking for your
                  details on every booking.
                </EmptyDescription>
              </EmptyHeader>
              <Button
                nativeButton={false}
                render={<Link href="/profile/new" />}
                variant="outline"
              >
                <UserPlus />
                Add traveller
              </Button>
            </Empty>
          ) : (
            <ul className="flex flex-col gap-2">
              {rows.map((row) => (
                <TravellerRowItem
                  key={row.id}
                  onRemoved={(id) =>
                    setRows((previous) =>
                      (previous ?? []).filter((item) => item.id !== id)
                    )
                  }
                  row={row}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
};
