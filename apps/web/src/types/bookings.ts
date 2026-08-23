export type BookingStatus =
  | "confirmed"
  | "created"
  | "issued"
  | "refunded"
  | "voided";

export type PassengerType = "adult" | "child" | "infant";

export interface BookingAirport {
  city: string;
  code: string;
  country: string;
}

export interface BookingSegment {
  airline: string;
  arrival: string;
  departure: string;
  destination: BookingAirport;
  flightNumber: string;
  origin: BookingAirport;
}

export interface BookingPassenger {
  name: string;
  type: PassengerType;
}

/** Mirrors a row returned by the booking.list endpoint (@atlas/db booking table). */
export interface Booking {
  createdAt: Date | string;
  currency: string | null;
  orderNo: string;
  payload: Record<string, unknown> | null;
  pnr: string | null;
  status: string;
  totalAmount: string | null;
  updatedAt: Date | string;
  userId: string | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

const toAirport = (value: unknown): BookingAirport | null => {
  if (!isRecord(value)) {
    return null;
  }
  const { city, code, country } = value;
  if (!isString(code)) {
    return null;
  }
  return {
    city: isString(city) ? city : code,
    code,
    country: isString(country) ? country : "",
  };
};

/** Best-effort extraction of flight segments from an Atlas order payload. */
export const getSegments = (payload: Record<string, unknown> | null) => {
  if (!payload) {
    return [];
  }
  const { segments } = payload;
  if (!Array.isArray(segments)) {
    return [];
  }
  const result: BookingSegment[] = [];
  for (const entry of segments) {
    if (!isRecord(entry)) {
      continue;
    }
    const origin = toAirport(entry.origin);
    const destination = toAirport(entry.destination);
    if (!origin || !destination) {
      continue;
    }
    result.push({
      airline: isString(entry.airline) ? entry.airline : "Unknown airline",
      arrival: isString(entry.arrival) ? entry.arrival : "",
      departure: isString(entry.departure) ? entry.departure : "",
      destination,
      flightNumber: isString(entry.flightNumber) ? entry.flightNumber : "",
      origin,
    });
  }
  return result;
};

/** Best-effort extraction of passengers from an Atlas order payload. */
export const getPassengers = (payload: Record<string, unknown> | null) => {
  if (!payload) {
    return [];
  }
  const { passengers } = payload;
  if (!Array.isArray(passengers)) {
    return [];
  }
  const result: BookingPassenger[] = [];
  for (const entry of passengers) {
    if (!isRecord(entry)) {
      continue;
    }
    const { name, type } = entry;
    if (!isString(name)) {
      continue;
    }
    const passengerType: PassengerType =
      type === "child" || type === "infant" ? type : "adult";
    result.push({ name, type: passengerType });
  }
  return result;
};

export const statusLabels: Record<BookingStatus, string> = {
  confirmed: "Confirmed",
  created: "Created",
  issued: "Issued",
  refunded: "Refunded",
  voided: "Voided",
};

export const statusRank: Record<BookingStatus, number> = {
  confirmed: 3,
  created: 2,
  issued: 4,
  refunded: 1,
  voided: 0,
};

/** Badge variant per booking status, shared by the table and detail views. */
export const statusVariants: Record<
  BookingStatus,
  "default" | "destructive" | "ghost" | "outline" | "secondary"
> = {
  confirmed: "secondary",
  created: "outline",
  issued: "default",
  refunded: "destructive",
  voided: "ghost",
};

/** Best-effort extraction of ticket numbers from a live Atlas queryOrder response. */
export const getTicketNumbers = (live: Record<string, unknown> | null) => {
  if (!live) {
    return [];
  }
  const tickets: string[] = [];
  for (const key of ["ticketNo", "ticketNumber", "ticketNos"]) {
    const value = live[key];
    if (isString(value)) {
      tickets.push(value);
    }
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (isString(entry) && !tickets.includes(entry)) {
          tickets.push(entry);
        }
      }
    }
  }
  return tickets;
};
