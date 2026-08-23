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

export interface BookingSeat {
  flightNumber: string;
  passenger: string;
  seat: string;
  segmentIndex: number | null;
}

export interface BookingBaggage {
  flightNumber: string;
  label: string;
  passenger: string;
  source: "included" | "purchased";
}

/** Disruption event record returned by the Atlas webhook.incidents endpoint. */
export interface BookingIncident {
  eventId: string;
  eventTime?: string;
  eventType: string;
  extraInfo?: string;
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
  const pushTicket = (value: unknown) => {
    if (isString(value) && !tickets.includes(value)) {
      tickets.push(value);
    }
  };
  for (const key of ["ticketNo", "ticketNumber", "ticketNos"]) {
    const value = live[key];
    pushTicket(value);
    if (Array.isArray(value)) {
      for (const entry of value) {
        pushTicket(entry);
      }
    }
  }
  const { paxTicketInfos } = live;
  if (Array.isArray(paxTicketInfos)) {
    for (const entry of paxTicketInfos) {
      if (!isRecord(entry)) {
        continue;
      }
      const { ticketNos } = entry;
      if (!Array.isArray(ticketNos)) {
        continue;
      }
      for (const ticket of ticketNos) {
        pushTicket(ticket);
      }
    }
  }
  return tickets;
};

const BAGGAGE_TYPE_LABELS: Record<string, string> = {
  CabinBaggageOverheadLocker: "Cabin",
  CabinBaggageUnderSeat: "Cabin",
  StandardCheckInBaggage: "Checked",
};

const formatBaggageAllowance = (
  piece: unknown,
  weight: unknown,
  size: unknown
): string => {
  const pieces = typeof piece === "number" ? piece : Number(piece);
  const kilos = typeof weight === "number" ? weight : Number(weight);
  const sizeLabel = isString(size) ? size : "";
  const hasPieces = Number.isFinite(pieces) && pieces > 0;
  const hasWeight = Number.isFinite(kilos) && kilos > 0;
  if (!(hasPieces || hasWeight)) {
    return "Not included";
  }
  const quantity = hasPieces ? `${pieces} × ` : "";
  const mass = hasWeight ? `${kilos} kg` : "pc";
  return sizeLabel ? `${quantity}${mass} · ${sizeLabel}` : `${quantity}${mass}`;
};

const flightNumberBySegment = (
  source: Record<string, unknown>
): Map<number, string> => {
  const byIndex = new Map<number, string>();
  const routing = isRecord(source.routing) ? source.routing : null;
  if (!routing) {
    return byIndex;
  }
  for (const key of ["fromSegments", "retSegments"]) {
    const list = routing[key];
    if (!Array.isArray(list)) {
      continue;
    }
    for (const entry of list) {
      if (!isRecord(entry)) {
        continue;
      }
      const index =
        typeof entry.segmentIndex === "number"
          ? entry.segmentIndex
          : Number(entry.segmentIndex);
      const flightNumber = isString(entry.flightNumber)
        ? entry.flightNumber
        : "";
      if (Number.isFinite(index) && flightNumber) {
        byIndex.set(index, flightNumber);
      }
    }
  }
  return byIndex;
};

const sourcesForAncillaries = (
  live: Record<string, unknown> | null,
  payload: Record<string, unknown> | null
): Record<string, unknown>[] => {
  const sources: Record<string, unknown>[] = [];
  if (live) {
    sources.push(live);
  }
  if (payload) {
    sources.push(payload);
  }
  return sources;
};

const toFiniteNumber = (value: unknown): number | null => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const flightForIndex = (
  flights: Map<number, string>,
  value: unknown
): string => {
  const index = toFiniteNumber(value);
  return index === null ? "" : (flights.get(index) ?? "");
};

const paxRecords = (
  source: Record<string, unknown>
): Record<string, unknown>[] => {
  const { paxTicketInfos } = source;
  if (!Array.isArray(paxTicketInfos)) {
    return [];
  }
  return paxTicketInfos.filter(isRecord);
};

const ancillaryRecords = (
  pax: Record<string, unknown>
): Record<string, unknown>[] => {
  const { ancillaries } = pax;
  if (!Array.isArray(ancillaries)) {
    return [];
  }
  return ancillaries.filter(isRecord);
};

const collectSeatsFromSource = (
  source: Record<string, unknown>,
  seen: Set<string>
): BookingSeat[] => {
  const seats: BookingSeat[] = [];
  const flights = flightNumberBySegment(source);
  for (const pax of paxRecords(source)) {
    const passenger = isString(pax.name) ? pax.name : "Passenger";
    for (const ancillary of ancillaryRecords(pax)) {
      const seat = isRecord(ancillary.auxSeatElement)
        ? ancillary.auxSeatElement
        : null;
      if (!seat) {
        continue;
      }
      const row = isString(seat.row) ? seat.row : "";
      const column = isString(seat.column) ? seat.column : "";
      if (!(row || column)) {
        continue;
      }
      const segmentIndex = toFiniteNumber(ancillary.segmentIndex);
      const key = `${passenger}:${row}${column}:${segmentIndex}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      seats.push({
        flightNumber: flightForIndex(flights, ancillary.segmentIndex),
        passenger,
        seat: `${row}${column}`,
        segmentIndex,
      });
    }
  }
  return seats;
};

/** Selected seats from a live queryOrder response or a stored payload snapshot. */
export const getSeats = (
  live: Record<string, unknown> | null,
  payload: Record<string, unknown> | null
): BookingSeat[] => {
  const seen = new Set<string>();
  return sourcesForAncillaries(live, payload).flatMap((source) =>
    collectSeatsFromSource(source, seen)
  );
};

const collectPurchasedBags = (
  source: Record<string, unknown>,
  pushBag: (bag: BookingBaggage) => void
) => {
  const flights = flightNumberBySegment(source);
  for (const pax of paxRecords(source)) {
    const passenger = isString(pax.name) ? pax.name : "Passenger";
    for (const ancillary of ancillaryRecords(pax)) {
      const baggage = isRecord(ancillary.auxBaggageElement)
        ? ancillary.auxBaggageElement
        : null;
      if (!baggage) {
        continue;
      }
      pushBag({
        flightNumber: flightForIndex(flights, ancillary.segmentIndex),
        label: `Extra bag · ${formatBaggageAllowance(baggage.piece, baggage.weight, baggage.size)}`,
        passenger,
        source: "purchased",
      });
    }
  }
};

const collectIncludedBags = (
  source: Record<string, unknown>,
  pushBag: (bag: BookingBaggage) => void
) => {
  const flights = flightNumberBySegment(source);
  const routing = isRecord(source.routing) ? source.routing : null;
  const rule = routing && isRecord(routing.rule) ? routing.rule : null;
  const elements = rule?.baggageElements;
  if (!Array.isArray(elements)) {
    return;
  }
  for (const element of elements) {
    if (!isRecord(element)) {
      continue;
    }
    const piece = toFiniteNumber(element.baggagePiece) ?? 0;
    const weight = toFiniteNumber(element.baggageWeight) ?? 0;
    if (!(piece > 0 || weight > 0)) {
      continue;
    }
    const typeKey = isString(element.baggageType) ? element.baggageType : "";
    const typeLabel = BAGGAGE_TYPE_LABELS[typeKey] || typeKey || "Baggage";
    pushBag({
      flightNumber: flightForIndex(flights, element.segmentNo),
      label: `${typeLabel} · ${formatBaggageAllowance(element.baggagePiece, element.baggageWeight, element.baggageSize)}`,
      passenger: "Included in fare",
      source: "included",
    });
  }
};

/** Included fare bags plus purchased extras from queryOrder or a stored snapshot. */
export const getBaggage = (
  live: Record<string, unknown> | null,
  payload: Record<string, unknown> | null
): BookingBaggage[] => {
  const bags: BookingBaggage[] = [];
  const seen = new Set<string>();
  const pushBag = (bag: BookingBaggage) => {
    const key = `${bag.source}:${bag.passenger}:${bag.label}:${bag.flightNumber}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    bags.push(bag);
  };

  for (const source of sourcesForAncillaries(live, payload)) {
    collectPurchasedBags(source, pushBag);
    collectIncludedBags(source, pushBag);
  }
  return bags;
};

/** Prefers the live Atlas PNR when the stored row has not been synced yet. */
export const getPnr = (
  booking: Pick<Booking, "pnr">,
  live: Record<string, unknown> | null
): string | null => {
  if (live) {
    const livePnr = live.pnrCode;
    if (isString(livePnr)) {
      return livePnr;
    }
  }
  return booking.pnr;
};
