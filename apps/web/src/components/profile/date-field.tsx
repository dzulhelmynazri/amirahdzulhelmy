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

const YEARS_AHEAD = 15;

/** The span of months the year dropdown may offer, for this kind of date. */
const monthBounds = (range: "future" | "past") => {
  const thisYear = new Date().getFullYear();

  // Opening on the current month either way. The year dropdown is how someone
  // reaches 1974; landing there by default would just be a long scroll back.
  const opensAt = new Date(thisYear, new Date().getMonth());

  return range === "past"
    ? { end: new Date(thisYear, 11), opensAt, start: new Date(1900, 0) }
    : {
        end: new Date(thisYear + YEARS_AHEAD, 11),
        opensAt,
        start: new Date(thisYear, 0),
      };
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

  // Only once the picker opens. Reading the clock during render makes the
  // whole page un-prerenderable for a value nothing needs until a calendar is
  // actually on screen.
  const bounds = open ? monthBounds(range) : undefined;

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
              defaultMonth={selected ?? bounds?.opensAt}
              endMonth={bounds?.end}
              mode="single"
              onSelect={(date) => {
                if (date) {
                  onChange(toIso(date));
                  setOpen(false);
                }
              }}
              selected={selected}
              startMonth={bounds?.start}
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
