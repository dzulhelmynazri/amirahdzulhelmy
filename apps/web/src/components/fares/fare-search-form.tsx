import { Button } from "@atlas/ui/components/button";
import { Calendar } from "@atlas/ui/components/calendar";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@atlas/ui/components/card";
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
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@atlas/ui/components/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@atlas/ui/components/input-group";
import {
  NativeSelect,
  NativeSelectOption,
} from "@atlas/ui/components/native-select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@atlas/ui/components/popover";
import { Separator } from "@atlas/ui/components/separator";
import { Spinner } from "@atlas/ui/components/spinner";
import { cn } from "@atlas/ui/lib/utils";
import { formatWeekdayDate } from "@atlas/utils/date";
import * as countryFlags from "country-flag-icons/react/3x2";
import {
  ArrowUpDown,
  CalendarDays,
  Minus,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import type { FormEvent } from "react";

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

const MS_PER_DAY = 86_400_000;

const clampPassengers = (value: number) =>
  Math.min(maxPassengers, Math.max(minPassengers, value));

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

const TravellersInput = ({
  onChange,
  value,
}: {
  onChange: (count: number) => void;
  value: number;
}) => (
  <InputGroup className="w-32">
    <InputGroupAddon>
      <InputGroupButton
        aria-label="Fewer travellers"
        disabled={value <= minPassengers}
        onClick={() => onChange(clampPassengers(value - 1))}
        size="icon-xs"
      >
        <Minus />
      </InputGroupButton>
    </InputGroupAddon>
    <InputGroupInput
      aria-label="Number of travellers"
      className="text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      id="fare-travellers"
      inputMode="numeric"
      max={maxPassengers}
      min={minPassengers}
      onChange={(event) => {
        const next = event.currentTarget.valueAsNumber;
        if (Number.isNaN(next)) {
          return;
        }
        onChange(clampPassengers(next));
      }}
      type="number"
      value={value}
    />
    <InputGroupAddon align="inline-end">
      <InputGroupButton
        aria-label="More travellers"
        disabled={value >= maxPassengers}
        onClick={() => onChange(clampPassengers(value + 1))}
        size="icon-xs"
      >
        <Plus />
      </InputGroupButton>
    </InputGroupAddon>
  </InputGroup>
);

const AirportFlag = ({ countryCode }: { countryCode: string }) => {
  const Flag = countryFlagRegistry[countryCode];

  if (!Flag) {
    return null;
  }

  return <Flag className="size-4" />;
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
      render={<Button aria-label={label} type="button" variant="outline" />}
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
              <span className="font-medium line-clamp-1">{airport.city}</span>
              <span className="truncate text-muted-foreground line-clamp-1">
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
        <CalendarDays data-icon="inline-start" />
        {value ? formatWeekdayDate(value) : placeholder}
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
  <div className="flex items-stretch gap-1 rounded-2xl bg-muted/50 p-1.5">
    <DatePicker
      align="start"
      disabledBefore={today}
      hint="Depart"
      label="Departure date"
      onSelect={onDepartureSelect}
      placeholder="Add date"
      value={departure}
    />

    <Separator className="my-2" orientation="vertical" />

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
          <Plus data-icon="inline-start" />
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
      <Card size="sm">
        <CardHeader>
          <CardTitle>Search</CardTitle>
          <CardAction>
            <Button
              aria-label="Reset search"
              onClick={reset}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <RotateCcw />
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent>
          <div>
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
          </div>

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

          <FieldGroup className="gap-1">
            <Field orientation="horizontal">
              <FieldLabel htmlFor="fare-trip-type">Trip</FieldLabel>
              <NativeSelect
                id="fare-trip-type"
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
            </Field>

            <Field orientation="horizontal">
              <FieldLabel htmlFor="fare-travellers">Travellers</FieldLabel>
              <TravellersInput
                onChange={(count) => update({ passengers: count })}
                value={passengers}
              />
            </Field>

            <Field orientation="horizontal">
              <FieldLabel htmlFor="fare-cabin">Cabin</FieldLabel>
              <NativeSelect
                id="fare-cabin"
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
            </Field>
          </FieldGroup>

          <Field>
            <Button
              className="w-full"
              disabled={!canSearch || isSearching}
              size="lg"
              type="submit"
            >
              {isSearching ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Search data-icon="inline-start" />
              )}
              {searchLabel(origin, destination, isSearching)}
            </Button>
            {blockingFields.length > 0 && !isSearching ? (
              <FieldDescription className="text-center">
                Add a {listMissing(blockingFields)} to search.
              </FieldDescription>
            ) : null}
          </Field>
        </CardContent>
      </Card>
    </form>
  );
};
