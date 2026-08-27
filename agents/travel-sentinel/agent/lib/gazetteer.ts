/**
 * Where a destination code is, from a table rather than a model.
 *
 * A model will produce coordinates for any city on earth, confidently and
 * sometimes wrongly. These coordinates decide which trip an earthquake is
 * reported against and where it lands on the globe, so a wrong latitude is an
 * alert filed against the wrong journey.
 *
 * An unknown code returns null and the caller says it does not know that
 * place. A gap is recoverable; a fabricated epicentre is not.
 */

export interface Place {
  countryCode: string;
  lat: number;
  lon: number;
  name: string;
}

/**
 * IATA codes this project actually serves. Extend by hand, never by lookup:
 * an entry that arrived from a model is the failure this table exists to
 * prevent.
 */
const GAZETTEER: Record<string, Place> = {
  BKK: { countryCode: "TH", lat: 13.69, lon: 100.75, name: "Bangkok" },
  CDG: { countryCode: "FR", lat: 49.01, lon: 2.55, name: "Paris" },
  CGK: { countryCode: "ID", lat: -6.13, lon: 106.66, name: "Jakarta" },
  DOH: { countryCode: "QA", lat: 25.27, lon: 51.61, name: "Doha" },
  DPS: { countryCode: "ID", lat: -8.75, lon: 115.17, name: "Denpasar" },
  DXB: { countryCode: "AE", lat: 25.25, lon: 55.36, name: "Dubai" },
  HAN: { countryCode: "VN", lat: 21.22, lon: 105.81, name: "Hanoi" },
  HKG: { countryCode: "HK", lat: 22.31, lon: 113.91, name: "Hong Kong" },
  HKT: { countryCode: "TH", lat: 8.11, lon: 98.31, name: "Phuket" },
  HND: { countryCode: "JP", lat: 35.55, lon: 139.78, name: "Tokyo" },
  ICN: { countryCode: "KR", lat: 37.46, lon: 126.44, name: "Seoul" },
  KIX: { countryCode: "JP", lat: 34.43, lon: 135.24, name: "Osaka" },
  KUL: { countryCode: "MY", lat: 2.75, lon: 101.71, name: "Kuala Lumpur" },
  LHR: { countryCode: "GB", lat: 51.47, lon: -0.45, name: "London" },
  MEL: { countryCode: "AU", lat: -37.67, lon: 144.84, name: "Melbourne" },
  MNL: { countryCode: "PH", lat: 14.51, lon: 121.02, name: "Manila" },
  NRT: { countryCode: "JP", lat: 35.77, lon: 140.39, name: "Tokyo" },
  PEN: { countryCode: "MY", lat: 5.3, lon: 100.28, name: "Penang" },
  SGN: { countryCode: "VN", lat: 10.82, lon: 106.66, name: "Ho Chi Minh City" },
  SIN: { countryCode: "SG", lat: 1.36, lon: 103.99, name: "Singapore" },
  SYD: { countryCode: "AU", lat: -33.94, lon: 151.18, name: "Sydney" },
  TPE: { countryCode: "TW", lat: 25.08, lon: 121.23, name: "Taipei" },
};

/** Null when we do not know where the code is — never a guess. */
export const placeOf = (code: string): Place | null =>
  GAZETTEER[code.trim().toUpperCase()] ?? null;

/**
 * Every code this agent can locate, for telling a traveller what is covered.
 * The table above is maintained in alphabetical order, so this needs no sort.
 */
export const knownCodes = (): string[] => Object.keys(GAZETTEER);
