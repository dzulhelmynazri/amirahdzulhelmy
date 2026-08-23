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
import { Spinner } from "@atlas/ui/components/spinner";
import { cn } from "@atlas/ui/lib/utils";
import * as countryFlags from "country-flag-icons/react/3x2";
import {
  ArrowUpDown,
  CalendarDays,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";

import { useFareSearch } from "./fare-search-context";
import {
  airportLabel,
  airports,
  cabinLabels,
  maxPassengers,
  minPassengers,
  tripTypeLabels,
} from "./fares-data";
import type { Airport, CabinClass, TripType } from "./fares-data";

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

/** "departure date", "origin and destination", "origin, a date and a return". */
const listMissing = (fields: string[]): string => {
  if (fields.length === 1) {
    return fields[0] ?? "";
  }
  const head = fields.slice(0, -1).join(", ");
  return `${head} and ${fields.at(-1)}`;
};

const searchLabel = (
  origin: Airport | null,
  destination: Airport | null,
  isSearching: boolean
) => {
  if (isSearching) {
    return "Searching Atlas…";
  }
  return origin && destination
    ? `Search ${origin.code} → ${destination.code}`
    : "Search fares";
};

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
  align,
  disabledBefore,
  hint,
  label,
  onSelect,
  placeholder,
  value,
}: {
  align: "end" | "start";
  disabledBefore: Date;
  hint: string;
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
          className="h-auto flex-1 flex-col items-start gap-0.5 rounded-xl px-3 py-2.5 font-normal"
          type="button"
          variant="ghost"
        />
      }
    >
      <span className="text-muted-foreground text-xs uppercase tracking-wide">
        {hint}
      </span>
      <span
        className={cn(
          "flex items-center gap-1.5 font-medium",
          !value && "font-normal text-muted-foreground"
        )}
      >
        <CalendarDays className="size-3.5 text-muted-foreground" />
        {value ? dateFormatter.format(value) : placeholder}
      </span>
    </PopoverTrigger>
    <PopoverContent align={align} className="w-auto p-0">
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

/**
 * Dates are a property of the trip, not of the destination. They get their own
 * band below both place panels rather than sitting inside them, and the nights
 * count lives here too instead of as a dangling summary row.
 */
const DatesPanel = ({
  departure,
  isRoundTrip,
  nights,
  onAddReturn,
  onDepartureSelect,
  onReturnSelect,
  returnDate,
  today,
}: {
  departure: Date | undefined;
  isRoundTrip: boolean;
  nights: number | null;
  onAddReturn: () => void;
  onDepartureSelect: (date: Date | undefined) => void;
  onReturnSelect: (date: Date | undefined) => void;
  returnDate: Date | undefined;
  today: Date;
}) => (
  <div className="mt-2 flex items-stretch gap-1 rounded-2xl bg-muted/50 p-1.5">
    <DatePicker
      align="start"
      disabledBefore={today}
      hint="Depart"
      label="Departure date"
      onSelect={onDepartureSelect}
      placeholder="Add date"
      value={departure}
    />

    <div aria-hidden="true" className="my-2 w-px shrink-0 bg-border" />

    {isRoundTrip ? (
      <DatePicker
        align="end"
        disabledBefore={departure ?? today}
        hint="Return"
        label="Return date"
        onSelect={onReturnSelect}
        placeholder="Add date"
        value={returnDate}
      />
    ) : (
      <Button
        className="h-auto flex-1 flex-col items-start gap-0.5 rounded-xl px-3 py-2.5 font-normal"
        onClick={onAddReturn}
        type="button"
        variant="ghost"
      >
        <span className="text-muted-foreground text-xs uppercase tracking-wide">
          Return
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Plus className="size-3.5" />
          Add return
        </span>
      </Button>
    )}

    {nights === null ? null : (
      <span className="self-center whitespace-nowrap px-3 text-muted-foreground text-sm">
        {nights} night{nights === 1 ? "" : "s"}
      </span>
    )}
  </div>
);

const AirportPanel = ({
  airport,
  emptyLabel,
  label,
  onAirportChange,
  pickerLabel,
}: {
  airport: Airport | null;
  emptyLabel: string;
  label: string;
  onAirportChange: (airport: Airport | null) => void;
  pickerLabel: string;
}) => (
  <div className="rounded-2xl bg-muted/50 px-4 py-3.5">
    <p className="text-muted-foreground text-xs uppercase tracking-wide">
      {label}
    </p>
    <div className="mt-1 flex items-center justify-between gap-3">
      <span
        className={cn(
          "truncate font-semibold text-2xl",
          !airport && "font-normal text-muted-foreground"
        )}
      >
        {airport ? airport.city : emptyLabel}
      </span>
      <AirportPicker
        label={pickerLabel}
        onValueChange={onAirportChange}
        value={airport}
      />
    </div>
    <p className="mt-0.5 h-5 truncate text-muted-foreground text-sm">
      {airport?.name ?? ""}
    </p>
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

export const FareSearchForm = ({ onSearched }: { onSearched?: () => void }) => {
  const {
    blockingFields,
    isSearching,
    reset,
    runSearch,
    search,
    swapAirports,
    update,
  } = useFareSearch();
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
    runSearch();
    onSearched?.();
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
          emptyLabel="Choose origin"
          label="From"
          onAirportChange={(airport) => update({ origin: airport })}
          pickerLabel="Select origin airport"
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
          emptyLabel="Choose destination"
          label="To"
          onAirportChange={(airport) => update({ destination: airport })}
          pickerLabel="Select destination airport"
        />

        <DatesPanel
          departure={departure}
          isRoundTrip={isRoundTrip}
          nights={nights}
          onAddReturn={() => handleTripTypeChange("round-trip")}
          onDepartureSelect={handleDepartureSelect}
          onReturnSelect={(date) => update({ returnDate: date })}
          returnDate={returnDate}
          today={today}
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
        </div>

        <Button
          className="mt-3 h-12 w-full rounded-2xl text-base"
          disabled={!canSearch || isSearching}
          type="submit"
        >
          {isSearching ? <Spinner /> : <Search />}
          {searchLabel(origin, destination, isSearching)}
        </Button>

        {blockingFields.length > 0 && !isSearching ? (
          <p className="mt-2 text-center text-muted-foreground text-sm">
            Add a {listMissing(blockingFields)} to search.
          </p>
        ) : null}
      </div>
    </form>
  );
};
