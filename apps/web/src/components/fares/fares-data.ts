export type CabinClass = "business" | "economy" | "first" | "premium";

export type TripType = "one-way" | "round-trip";

export interface Airport {
  city: string;
  code: string;
  countryCode: string;
  name: string;
}

export const cabinLabels: Record<CabinClass, string> = {
  business: "Business",
  economy: "Economy",
  first: "First",
  premium: "Premium economy",
};

export const tripTypeLabels: Record<TripType, string> = {
  "one-way": "One way",
  "round-trip": "Round trip",
};

export const minPassengers = 1;

export const maxPassengers = 9;

export const airports: Airport[] = [
  {
    city: "Kuala Lumpur",
    code: "KUL",
    countryCode: "MY",
    name: "Kuala Lumpur International",
  },
  {
    city: "Subang",
    code: "SZB",
    countryCode: "MY",
    name: "Sultan Abdul Aziz Shah",
  },
  {
    city: "Penang",
    code: "PEN",
    countryCode: "MY",
    name: "Penang International",
  },
  {
    city: "Langkawi",
    code: "LGK",
    countryCode: "MY",
    name: "Langkawi International",
  },
  {
    city: "Kota Kinabalu",
    code: "BKI",
    countryCode: "MY",
    name: "Kota Kinabalu International",
  },
  {
    city: "Kuching",
    code: "KCH",
    countryCode: "MY",
    name: "Kuching International",
  },
  {
    city: "Johor Bahru",
    code: "JHB",
    countryCode: "MY",
    name: "Senai International",
  },
  {
    city: "Singapore",
    code: "SIN",
    countryCode: "SG",
    name: "Changi",
  },
  {
    city: "Bangkok",
    code: "BKK",
    countryCode: "TH",
    name: "Suvarnabhumi",
  },
  {
    city: "Jakarta",
    code: "CGK",
    countryCode: "ID",
    name: "Soekarno-Hatta International",
  },
  {
    city: "Bali",
    code: "DPS",
    countryCode: "ID",
    name: "Ngurah Rai International",
  },
  {
    city: "Ho Chi Minh City",
    code: "SGN",
    countryCode: "VN",
    name: "Tan Son Nhat International",
  },
  {
    city: "Manila",
    code: "MNL",
    countryCode: "PH",
    name: "Ninoy Aquino International",
  },
  {
    city: "Hong Kong",
    code: "HKG",
    countryCode: "HK",
    name: "Hong Kong International",
  },
  {
    city: "Taipei",
    code: "TPE",
    countryCode: "TW",
    name: "Taoyuan International",
  },
  {
    city: "Tokyo",
    code: "HND",
    countryCode: "JP",
    name: "Haneda",
  },
  {
    city: "Tokyo",
    code: "NRT",
    countryCode: "JP",
    name: "Narita International",
  },
  {
    city: "Osaka",
    code: "KIX",
    countryCode: "JP",
    name: "Kansai International",
  },
  {
    city: "Seoul",
    code: "ICN",
    countryCode: "KR",
    name: "Incheon International",
  },
  {
    city: "Sydney",
    code: "SYD",
    countryCode: "AU",
    name: "Kingsford Smith",
  },
  {
    city: "Dubai",
    code: "DXB",
    countryCode: "AE",
    name: "Dubai International",
  },
  {
    city: "London",
    code: "LHR",
    countryCode: "GB",
    name: "Heathrow",
  },
];

export const airportLabel = (airport: Airport) =>
  `${airport.city} (${airport.code})`;

export const airportByCode = new Map(
  airports.map((airport) => [airport.code, airport])
);

export interface Airline {
  code: string;
  name: string;
  /** Tailwind classes for the badge that stands in for the carrier logo. */
  tint: string;
}

export const airlines: Record<string, Airline> = {
  AK: {
    code: "AK",
    name: "AirAsia",
    tint: "bg-red-500/15 text-red-600 dark:text-red-400",
  },
  FY: {
    code: "FY",
    name: "Firefly",
    tint: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  },
  MH: {
    code: "MH",
    name: "Malaysia Airlines",
    tint: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  },
  OD: {
    code: "OD",
    name: "Batik Air Malaysia",
    tint: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  },
  SQ: {
    code: "SQ",
    name: "Singapore Airlines",
    tint: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  TR: {
    code: "TR",
    name: "Scoot",
    tint: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-500",
  },
  VJ: {
    code: "VJ",
    name: "Vietjet Air",
    tint: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  },
};

export interface FareDeal {
  airlineCode: string;
  /** ISO date the outbound leg departs. */
  departureDate: string;
  destinationCode: string;
  id: string;
  originCode: string;
  price: number;
  /** ISO date the inbound leg returns. */
  returnDate: string;
  stops: number;
}

export const fareCurrency = "MYR";

/** Origins offered as quick filters above the deal cards. */
export const dealOriginCodes = ["KUL", "PEN", "BKI", "KCH"] as const;

export const fareDeals: FareDeal[] = [
  {
    airlineCode: "TR",
    departureDate: "2026-10-22",
    destinationCode: "SIN",
    id: "deal-kul-sin",
    originCode: "KUL",
    price: 390,
    returnDate: "2026-10-28",
    stops: 0,
  },
  {
    airlineCode: "AK",
    departureDate: "2026-10-22",
    destinationCode: "LGK",
    id: "deal-kul-lgk",
    originCode: "KUL",
    price: 224,
    returnDate: "2026-10-28",
    stops: 0,
  },
  {
    airlineCode: "AK",
    departureDate: "2026-10-01",
    destinationCode: "PEN",
    id: "deal-kul-pen",
    originCode: "KUL",
    price: 224,
    returnDate: "2026-10-07",
    stops: 0,
  },
  {
    airlineCode: "MH",
    departureDate: "2026-11-05",
    destinationCode: "BKK",
    id: "deal-kul-bkk",
    originCode: "KUL",
    price: 612,
    returnDate: "2026-11-12",
    stops: 0,
  },
  {
    airlineCode: "AK",
    departureDate: "2026-11-18",
    destinationCode: "DPS",
    id: "deal-kul-dps",
    originCode: "KUL",
    price: 588,
    returnDate: "2026-11-25",
    stops: 0,
  },
  {
    airlineCode: "VJ",
    departureDate: "2026-12-03",
    destinationCode: "SGN",
    id: "deal-kul-sgn",
    originCode: "KUL",
    price: 497,
    returnDate: "2026-12-09",
    stops: 0,
  },
  {
    airlineCode: "FY",
    departureDate: "2026-10-08",
    destinationCode: "SZB",
    id: "deal-pen-szb",
    originCode: "PEN",
    price: 198,
    returnDate: "2026-10-12",
    stops: 0,
  },
  {
    airlineCode: "TR",
    departureDate: "2026-10-12",
    destinationCode: "SIN",
    id: "deal-pen-sin",
    originCode: "PEN",
    price: 315,
    returnDate: "2026-10-18",
    stops: 0,
  },
  {
    airlineCode: "AK",
    departureDate: "2026-10-20",
    destinationCode: "BKK",
    id: "deal-pen-bkk",
    originCode: "PEN",
    price: 402,
    returnDate: "2026-10-27",
    stops: 0,
  },
  {
    airlineCode: "OD",
    departureDate: "2026-11-09",
    destinationCode: "CGK",
    id: "deal-pen-cgk",
    originCode: "PEN",
    price: 731,
    returnDate: "2026-11-16",
    stops: 1,
  },
  {
    airlineCode: "AK",
    departureDate: "2026-10-14",
    destinationCode: "KUL",
    id: "deal-bki-kul",
    originCode: "BKI",
    price: 268,
    returnDate: "2026-10-20",
    stops: 0,
  },
  {
    airlineCode: "AK",
    departureDate: "2026-10-24",
    destinationCode: "KCH",
    id: "deal-bki-kch",
    originCode: "BKI",
    price: 232,
    returnDate: "2026-10-30",
    stops: 0,
  },
  {
    airlineCode: "TR",
    departureDate: "2026-10-22",
    destinationCode: "SIN",
    id: "deal-bki-sin",
    originCode: "BKI",
    price: 486,
    returnDate: "2026-10-29",
    stops: 0,
  },
  {
    airlineCode: "MH",
    departureDate: "2026-11-21",
    destinationCode: "HKG",
    id: "deal-bki-hkg",
    originCode: "BKI",
    price: 1284,
    returnDate: "2026-11-28",
    stops: 1,
  },
  {
    airlineCode: "AK",
    departureDate: "2026-10-11",
    destinationCode: "KUL",
    id: "deal-kch-kul",
    originCode: "KCH",
    price: 172,
    returnDate: "2026-10-17",
    stops: 0,
  },
  {
    airlineCode: "AK",
    departureDate: "2026-10-24",
    destinationCode: "BKI",
    id: "deal-kch-bki",
    originCode: "KCH",
    price: 232,
    returnDate: "2026-10-30",
    stops: 0,
  },
  {
    airlineCode: "TR",
    departureDate: "2026-11-02",
    destinationCode: "SIN",
    id: "deal-kch-sin",
    originCode: "KCH",
    price: 341,
    returnDate: "2026-11-08",
    stops: 0,
  },
  {
    airlineCode: "OD",
    departureDate: "2026-12-05",
    destinationCode: "BKK",
    id: "deal-kch-bkk",
    originCode: "KCH",
    price: 724,
    returnDate: "2026-12-13",
    stops: 1,
  },
];
