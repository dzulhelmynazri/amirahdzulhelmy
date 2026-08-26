"use client";

import { Button } from "@atlas/ui/components/button";
import { Calendar } from "@atlas/ui/components/calendar";
import { Input } from "@atlas/ui/components/input";
import { Label } from "@atlas/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@atlas/ui/components/popover";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";

/**
 * A date field that can be typed or picked.
 *
 * Typing stays available because someone copying a passport already knows the
 * date and a calendar is slower than eight keystrokes. The picker exists for
 * everyone else, and it carries month and year dropdowns: a date of birth is
 * decades back, and paging a month at a time is not a real option.
 *
 * Dates are handled as local Y/M/D throughout. `new Date("1999-05-11")` parses
 * as UTC, which lands on the 10th for anyone west of Greenwich — a silently
 * wrong birthday on a ticket.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;

const parseIso = (value: string): Date | undefined => {
  if (!ISO_DATE.test(value)) {
    return;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);

  // Rejects 2025-02-31, which would otherwise roll forward into March.
  return parsed.getMonth() === month - 1 ? parsed : undefined;
};

const toIso = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

export const DateField = ({
  error,
  hint,
  id,
  label,
  onChange,
  placeholder,
  range,
  value,
}: {
  error?: string;
  hint?: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Bounds the year dropdown: birthdays look back, documents look forward. */
  range: "future" | "past";
  value: string;
}) => {
  const [open, setOpen] = useState(false);
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = error ? `${id}-error` : hintId;
  const selected = parseIso(value);
  const today = new Date();

  const startMonth =
    range === "past" ? new Date(1900, 0) : new Date(today.getFullYear(), 0);
  const endMonth =
    range === "past"
      ? new Date(today.getFullYear(), 11)
      : new Date(today.getFullYear() + 15, 11);

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className="pr-10"
          id={id}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          value={value}
        />
        <Popover onOpenChange={setOpen} open={open}>
          <PopoverTrigger
            render={
              <Button
                aria-label={`Pick ${label.toLowerCase()}`}
                className="-translate-y-1/2 absolute top-1/2 right-1 size-7 text-muted-foreground"
                size="icon"
                type="button"
                variant="ghost"
              >
                <CalendarIcon className="size-4" />
              </Button>
            }
          />
          <PopoverContent align="end" className="w-auto p-0">
            <Calendar
              captionLayout="dropdown"
              defaultMonth={selected ?? (range === "past" ? undefined : today)}
              endMonth={endMonth}
              mode="single"
              onSelect={(date) => {
                if (date) {
                  onChange(toIso(date));
                  setOpen(false);
                }
              }}
              selected={selected}
              startMonth={startMonth}
            />
          </PopoverContent>
        </Popover>
      </div>
      {error ? (
        <p className="text-destructive text-xs" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
      {hint && !error ? (
        <p className="text-muted-foreground text-xs" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
};
