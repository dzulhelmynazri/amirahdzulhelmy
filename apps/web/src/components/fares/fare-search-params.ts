import {
  createParser,
  createSerializer,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs";

import { minPassengers } from "./fares-data";
import type { CabinClass, TripType } from "./fares-data";

export const FARE_SEARCH_PATH = "/fares/search";

export const cabinValues = [
  "economy",
  "premium",
  "business",
  "first",
] as const satisfies readonly CabinClass[];

export const tripValues = [
  "one-way",
  "round-trip",
] as const satisfies readonly TripType[];

/** Atlas and the form both speak local-midnight `YYYY-MM-DD`. */
export const toIsoDate = (date: Date) => {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

/** Parses an ISO `YYYY-MM-DD` string as a local-midnight date. */
export const parseLocalDate = (value: string) => {
  const [yearPart, monthPart, dayPart] = value.split("-");

  if (
    yearPart === undefined ||
    monthPart === undefined ||
    dayPart === undefined ||
    yearPart.length !== 4 ||
    monthPart.length !== 2 ||
    dayPart.length !== 2
  ) {
    return null;
  }

  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);

  if (![year, month, day].every(Number.isInteger)) {
    return null;
  }

  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
};

const parseAsLocalDate = createParser({
  eq: (left, right) => left.getTime() === right.getTime(),
  parse: parseLocalDate,
  serialize: toIsoDate,
});

export const fareSearchParams = {
  adults: parseAsInteger.withDefault(minPassengers),
  cabin: parseAsStringLiteral(cabinValues).withDefault("economy"),
  departure: parseAsLocalDate,
  destination: parseAsString,
  origin: parseAsString,
  returnDate: parseAsLocalDate,
  trip: parseAsStringLiteral(tripValues).withDefault("round-trip"),
};

export const serializeFareSearch = createSerializer(fareSearchParams);
