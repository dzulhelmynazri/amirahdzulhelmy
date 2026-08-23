"use client";

import { Button } from "@atlas/ui/components/button";
import { Calendar } from "@atlas/ui/components/calendar";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@atlas/ui/components/combobox";
import {
  NativeSelect,
  NativeSelectOption,
} from "@atlas/ui/components/native-select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@atlas/ui/components/popover";
import { cn } from "@atlas/ui/lib/utils";
import * as countryFlags from "country-flag-icons/react/3x2";
import { ArrowUpDown, CalendarDays, RotateCcw } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { toast } from "sonner";

import {
  airportLabel,
  airports,
  cabinLabels,
  maxPassengers,
  minPassengers,
  tripTypeLabels,
} from "./fares-data";
import type { Airport, CabinClass, TripType } from "./fares-data";
import { useFareSearch } from "./use-fare-search";

type FlagComponent = typeof countryFlags.MY;

const countryFlagRegistry: Record<string, FlagComponent> = { ...countryFlags };

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  weekday: "short",
});

const MS_PER_DAY = 86_400_000;

const passengerOptions = Array.from(
  { length: maxPassengers - minPassengers + 1 },
  (_, index) => minPassengers + index
);

/** Strips the select chrome so the summary rows read as plain key/value text. */
const inlineSelectClass =
  "[&>select]:border-transparent [&>select]:bg-transparent [&>select]:font-medium [&>select]:shadow-none dark:[&>select]:bg-transparent";

const startOfToday = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
};

const nightsBetween = (from: Date, to: Date) =>
  Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);

const AirportFlag = ({ countryCode }: { countryCode: string }) => {
  const Flag = countryFlagRegistry[countryCode];

  if (!Flag) {
    return null;
  }

  return <Flag className="h-3 w-4.5 rounded-[2px] ring-1 ring-foreground/10" />;
};

const AirportPicker = ({
  label,
  onValueChange,
  value,
}: {
  label: string;
  onValueChange: (airport: Airport | null) => void;
  value: Airport | null;
}) => (
  <Combobox
    items={airports}
    itemToStringLabel={airportLabel}
    onValueChange={onValueChange}
    value={value}
  >
    <ComboboxTrigger
      render={
        <Button
          aria-label={label}
          className="shrink-0 rounded-full px-3"
          type="button"
          variant="outline"
        />
      }
    >
      {value ? (
        <>
          <AirportFlag countryCode={value.countryCode} />
          <span className="font-medium">{value.code}</span>
        </>
      ) : (
        <span className="text-muted-foreground">Select</span>
      )}
    </ComboboxTrigger>
    <ComboboxContent align="end" className="w-72">
      <ComboboxInput placeholder="Search city or airport" showTrigger={false} />
      <ComboboxEmpty>No airports found.</ComboboxEmpty>
      <ComboboxList>
        <ComboboxCollection>
          {(airport: Airport) => (
            <ComboboxItem key={airport.code} value={airport}>
              <AirportFlag countryCode={airport.countryCode} />
              <span className="font-medium">{airport.city}</span>
              <span className="truncate text-muted-foreground">
                {airport.name}
              </span>
              <span className="ml-auto text-muted-foreground text-xs">
                {airport.code}
              </span>
            </ComboboxItem>
          )}
        </ComboboxCollection>
      </ComboboxList>
    </ComboboxContent>
  </Combobox>
);

const DatePicker = ({
  disabledBefore,
  label,
  onSelect,
  placeholder,
  value,
}: {
  disabledBefore: Date;
  label: string;
  onSelect: (date: Date | undefined) => void;
  placeholder: string;
  value: Date | undefined;
}) => (
  <Popover>
    <PopoverTrigger
      render={
        <Button
          aria-label={label}
          className="-mr-1.5 h-7 gap-1.5 font-normal"
          type="button"
          variant="ghost"
        />
      }
    >
      <CalendarDays className="text-muted-foreground" />
      <span className={cn(!value && "text-muted-foreground")}>
        {value ? dateFormatter.format(value) : placeholder}
      </span>
    </PopoverTrigger>
    <PopoverContent align="end" className="w-auto p-0">
      <Calendar
        autoFocus
        disabled={{ before: disabledBefore }}
        mode="single"
        onSelect={onSelect}
        selected={value}
      />
    </PopoverContent>
  </Popover>
);

const AirportPanel = ({
  airport,
  date,
  dateDisabledBefore,
  dateLabel,
  datePlaceholder,
  label,
  onAirportChange,
  onDateSelect,
  pickerLabel,
  showDate,
}: {
  airport: Airport | null;
  date: Date | undefined;
  dateDisabledBefore: Date;
  dateLabel: string;
  datePlaceholder: string;
  label: string;
  onAirportChange: (airport: Airport | null) => void;
  onDateSelect: (date: Date | undefined) => void;
  pickerLabel: string;
  showDate: boolean;
}) => (
  <div className="rounded-2xl bg-muted/50 px-4 py-3.5">
    <p className="text-muted-foreground text-xs uppercase tracking-wide">
      {label}
    </p>
    <div className="mt-1 flex items-center justify-between gap-3">
      <span
        className={cn(
          "truncate font-semibold text-2xl",
          !airport && "text-muted-foreground"
        )}
      >
        {airport ? airport.city : "Anywhere"}
      </span>
      <AirportPicker
        label={pickerLabel}
        onValueChange={onAirportChange}
        value={airport}
      />
    </div>
    <div className="mt-1 flex items-center justify-between gap-3 text-muted-foreground text-sm">
      <span className="truncate">{airport ? airport.name : "Not set"}</span>
      {showDate ? (
        <DatePicker
          disabledBefore={dateDisabledBefore}
          label={dateLabel}
          onSelect={onDateSelect}
          placeholder={datePlaceholder}
          value={date}
        />
      ) : null}
    </div>
  </div>
);

const SummaryRow = ({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) => (
  <div className="flex min-h-9 items-center justify-between gap-2 text-sm">
    <span className="text-muted-foreground">{label}</span>
    {children}
  </div>
);

export const FareSearchForm = () => {
  const { reset, search, swapAirports, update } = useFareSearch();
  const {
    cabin,
    departure,
    destination,
    origin,
    passengers,
    returnDate,
    tripType,
  } = search;

  const isRoundTrip = tripType === "round-trip";
  const today = startOfToday();

  const canSearch = Boolean(
    origin && destination && departure && (!isRoundTrip || returnDate)
  );

  const nights =
    departure && returnDate ? nightsBetween(departure, returnDate) : null;

  const handleTripTypeChange = (value: TripType) => {
    update({
      returnDate: value === "one-way" ? undefined : returnDate,
      tripType: value,
    });
  };

  const handleDepartureSelect = (date: Date | undefined) => {
    const clearsReturn = Boolean(date && returnDate && returnDate < date);

    update({
      departure: date,
      returnDate: clearsReturn ? undefined : returnDate,
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!(origin && destination && departure)) {
      return;
    }

    const dates = returnDate
      ? `${dateFormatter.format(departure)} – ${dateFormatter.format(returnDate)}`
      : dateFormatter.format(departure);

    toast.info(`${origin.code} → ${destination.code}`, {
      description: `${dates} · ${passengers} traveller${passengers > 1 ? "s" : ""} · ${cabinLabels[cabin]}`,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="rounded-3xl border bg-card p-3 shadow-sm">
        <div className="flex items-center justify-between px-2 pb-3">
          <h3 className="font-medium">Search</h3>
          <Button
            aria-label="Reset search"
            onClick={reset}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <RotateCcw />
          </Button>
        </div>

        <AirportPanel
          airport={origin}
          date={departure}
          dateDisabledBefore={today}
          dateLabel="Departure date"
          datePlaceholder="Departure"
          label="From"
          onAirportChange={(airport) => update({ origin: airport })}
          onDateSelect={handleDepartureSelect}
          pickerLabel="Select origin airport"
          showDate
        />

        <div className="-my-3 relative z-10 flex justify-center">
          <Button
            aria-label="Swap origin and destination"
            className="size-9 rounded-full border-4 border-card bg-muted shadow-xs hover:bg-muted"
            onClick={swapAirports}
            size="icon"
            type="button"
            variant="ghost"
          >
            <ArrowUpDown />
          </Button>
        </div>

        <AirportPanel
          airport={destination}
          date={returnDate}
          dateDisabledBefore={departure ?? today}
          dateLabel="Return date"
          datePlaceholder="Return"
          label="To"
          onAirportChange={(airport) => update({ destination: airport })}
          onDateSelect={(date) => update({ returnDate: date })}
          pickerLabel="Select destination airport"
          showDate={isRoundTrip}
        />

        <div className="mt-3 flex flex-col px-3">
          <SummaryRow label="Trip">
            <NativeSelect
              aria-label="Trip type"
              className={inlineSelectClass}
              onChange={(event) => {
                const { value } = event.target;
                handleTripTypeChange(value as TripType);
              }}
              size="sm"
              value={tripType}
            >
              {Object.entries(tripTypeLabels).map(([value, label]) => (
                <NativeSelectOption key={value} value={value}>
                  {label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </SummaryRow>

          <SummaryRow label="Travellers">
            <NativeSelect
              aria-label="Number of travellers"
              className={inlineSelectClass}
              onChange={(event) => {
                const { value } = event.target;
                update({ passengers: Number(value) });
              }}
              size="sm"
              value={passengers}
            >
              {passengerOptions.map((count) => (
                <NativeSelectOption key={count} value={count}>
                  {count} traveller{count > 1 ? "s" : ""}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </SummaryRow>

          <SummaryRow label="Cabin">
            <NativeSelect
              aria-label="Cabin class"
              className={inlineSelectClass}
              onChange={(event) => {
                const { value } = event.target;
                update({ cabin: value as CabinClass });
              }}
              size="sm"
              value={cabin}
            >
              {Object.entries(cabinLabels).map(([value, label]) => (
                <NativeSelectOption key={value} value={value}>
                  {label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </SummaryRow>

          <SummaryRow label="Length">
            <span className="pr-2.5 font-medium">
              {nights === null
                ? "—"
                : `${nights} night${nights === 1 ? "" : "s"}`}
            </span>
          </SummaryRow>
        </div>

        <Button
          className="mt-3 h-12 w-full rounded-2xl text-base"
          disabled={!canSearch}
          type="submit"
        >
          {origin && destination
            ? `Explore ${origin.code} → ${destination.code}`
            : "Explore fares"}
        </Button>
      </div>
    </form>
  );
};
