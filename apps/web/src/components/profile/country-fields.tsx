"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@atlas/ui/components/combobox";
import { Input } from "@atlas/ui/components/input";
import { Label } from "@atlas/ui/components/label";

import type { Country } from "@/lib/countries";
import {
  COUNTRIES,
  findCountry,
  formatAtlasPhone,
  parseAtlasPhone,
} from "@/lib/countries";

/**
 * Country and phone inputs for the traveller form.
 *
 * Both replace free-text boxes that asked people to recall an ISO-3166 code
 * from memory. "MY" is guessable; "issuing country of a Swiss passport" is CH,
 * not SW, and a wrong code here is a rejected booking rather than a typo.
 */

const renderCountryItem = (country: Country) => (
  <ComboboxItem key={country.iso2} value={country}>
    <span aria-hidden className="text-base">
      {country.flag}
    </span>
    <span className="flex-1 truncate">{country.name}</span>
    <span className="text-muted-foreground text-xs">
      +{country.callingCode}
    </span>
  </ComboboxItem>
);

export const CountryCombobox = ({
  hint,
  id,
  label,
  onChange,
  value,
}: {
  hint?: string;
  id: string;
  label: string;
  onChange: (iso2: string) => void;
  value: string;
}) => {
  const selected = findCountry(value) ?? null;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Combobox
        items={COUNTRIES}
        itemToStringLabel={(country: Country) => country.name}
        onValueChange={(country: Country | null) =>
          onChange(country ? country.iso2 : "")
        }
        value={selected}
      >
        <ComboboxInput
          className="w-full"
          id={id}
          placeholder="Search country"
        />
        <ComboboxContent>
          <ComboboxEmpty>No country found.</ComboboxEmpty>
          <ComboboxList>{renderCountryItem}</ComboboxList>
        </ComboboxContent>
      </Combobox>
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  );
};

/**
 * Phone entry split into a country picker and a local number.
 *
 * Atlas stores the two joined as `0060-123456789`, which is not a format
 * anyone types unprompted — the old single text box made the reader reverse
 * engineer it from a placeholder. The parts are edited separately and joined
 * on the way out.
 */
export const PhoneField = ({
  defaultIso2 = "MY",
  id,
  label,
  onChange,
  value,
}: {
  defaultIso2?: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) => {
  const parsed = parseAtlasPhone(value);

  // A calling code alone cannot identify a country — +1 covers the US, Canada
  // and much of the Caribbean — so the first match is only ever a display hint.
  const country =
    (parsed
      ? COUNTRIES.find((entry) => entry.callingCode === parsed.callingCode)
      : undefined) ??
    findCountry(defaultIso2) ??
    COUNTRIES[0];

  const local = parsed?.local ?? "";

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        {/*
          Same shape as the country pickers above rather than a separate
          trigger with the search box inside the popup: that arrangement needs
          the popup anchored by hand, and without it the list never opens.
        */}
        <Combobox
          items={COUNTRIES}
          itemToStringLabel={(entry: Country) =>
            `${entry.flag} +${entry.callingCode}`
          }
          onValueChange={(entry: Country | null) =>
            onChange(formatAtlasPhone(entry ? entry.callingCode : "", local))
          }
          value={country}
        >
          <ComboboxInput
            aria-label="Country calling code"
            className="w-32 shrink-0"
          />
          <ComboboxContent className="w-72">
            <ComboboxEmpty>No country found.</ComboboxEmpty>
            <ComboboxList>{renderCountryItem}</ComboboxList>
          </ComboboxContent>
        </Combobox>
        <Input
          className="flex-1"
          id={id}
          inputMode="tel"
          onChange={(event) =>
            onChange(formatAtlasPhone(country.callingCode, event.target.value))
          }
          placeholder="123456789"
          value={local}
        />
      </div>
      <p className="text-muted-foreground text-xs">
        {value ? `Sent to the airline as ${value}` : "Number without the 0."}
      </p>
    </div>
  );
};
