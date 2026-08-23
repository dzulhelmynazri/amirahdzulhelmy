import type { Booking, BookingSegment } from "../src/types/bookings";

/**
 * Seed-shaped view of the Atlas order snapshot written to booking.payload.
 * Mirrors the fields the booking-agent extracts from order/queryOrder
 * responses: orderId, pnrList, passengers, segments, and price fields.
 */
export interface SeedBookingPayload {
  displayCurrency: string;
  orderId: string;
  passengers: { name: string; type: "adult" | "child" | "infant" }[];
  pnrList: string[];
  segments: BookingSegment[];
  totalPrice: string;
}

const KUL: BookingSegment["origin"] = {
  city: "Kuala Lumpur",
  code: "KUL",
  country: "MY",
};

/**
 * Demo bookings upserted by seed-bookings.ts. Rows keep the same shape as
 * the booking.list endpoint so the seeded data exercises the real UI path.
 */
export const seedBookings: Booking[] = [
  {
    createdAt: "2026-08-15T09:24:00Z",
    currency: "USD",
    orderNo: "AT-26081543",
    payload: {
      displayCurrency: "USD",
      orderId: "AT-26081543",
      passengers: [
        { name: "Amirah Dzulkifli", type: "adult" },
        { name: "Danial Hakim", type: "adult" },
      ],
      pnrList: ["MH4XQZ"],
      segments: [
        {
          airline: "Malaysia Airlines",
          arrival: "2026-09-12T16:35:00Z",
          departure: "2026-09-12T08:10:00Z",
          destination: { city: "Tokyo", code: "NRT", country: "JP" },
          flightNumber: "MH88",
          origin: KUL,
        },
      ],
      totalPrice: "1842.50",
    } satisfies SeedBookingPayload,
    pnr: "MH4XQZ",
    status: "issued",
    totalAmount: "1842.50",
    updatedAt: "2026-08-15T09:41:00Z",
    userId: "usr_local_demo",
  },
  {
    createdAt: "2026-08-12T14:02:00Z",
    currency: "USD",
    orderNo: "AT-26081207",
    payload: {
      displayCurrency: "USD",
      orderId: "AT-26081207",
      passengers: [{ name: "Amirah Dzulkifli", type: "adult" }],
      pnrList: ["SINQ8A"],
      segments: [
        {
          airline: "Malaysia Airlines",
          arrival: "2026-09-03T10:45:00Z",
          departure: "2026-09-03T09:40:00Z",
          destination: { city: "Singapore", code: "SIN", country: "SG" },
          flightNumber: "MH602",
          origin: KUL,
        },
      ],
      totalPrice: "186.00",
    } satisfies SeedBookingPayload,
    pnr: "SINQ8A",
    status: "confirmed",
    totalAmount: "186.00",
    updatedAt: "2026-08-12T14:05:00Z",
    userId: "usr_local_demo",
  },
  {
    createdAt: "2026-08-21T20:15:00Z",
    currency: "USD",
    orderNo: "AT-26082104",
    payload: {
      displayCurrency: "USD",
      orderId: "AT-26082104",
      passengers: [
        { name: "Amirah Dzulkifli", type: "adult" },
        { name: "Danial Hakim", type: "adult" },
        { name: "Aisyah Hakim", type: "child" },
      ],
      pnrList: [],
      segments: [
        {
          airline: "Malaysia Airlines",
          arrival: "2026-10-02T14:20:00Z",
          departure: "2026-10-02T07:35:00Z",
          destination: { city: "Seoul", code: "ICN", country: "KR" },
          flightNumber: "MH66",
          origin: KUL,
        },
      ],
      totalPrice: "2310.00",
    } satisfies SeedBookingPayload,
    pnr: null,
    status: "created",
    totalAmount: "2310.00",
    updatedAt: "2026-08-21T20:15:00Z",
    userId: "usr_local_demo",
  },
  {
    createdAt: "2026-08-05T11:48:00Z",
    currency: "USD",
    orderNo: "AT-26080512",
    payload: {
      displayCurrency: "USD",
      orderId: "AT-26080512",
      passengers: [
        { name: "Amirah Dzulkifli", type: "adult" },
        { name: "Zulkifli Amin", type: "adult" },
      ],
      pnrList: ["7HKLM2"],
      segments: [
        {
          airline: "Malaysia Airlines",
          arrival: "2026-11-08T13:55:00Z",
          departure: "2026-11-08T00:25:00Z",
          destination: { city: "Paris", code: "CDG", country: "FR" },
          flightNumber: "MH20",
          origin: KUL,
        },
        {
          airline: "Malaysia Airlines",
          arrival: "2026-11-20T06:45:00Z",
          departure: "2026-11-19T16:40:00Z",
          destination: KUL,
          flightNumber: "MH21",
          origin: { city: "Paris", code: "CDG", country: "FR" },
        },
      ],
      totalPrice: "2894.20",
    } satisfies SeedBookingPayload,
    pnr: "7HKLM2",
    status: "issued",
    totalAmount: "2894.20",
    updatedAt: "2026-08-05T12:10:00Z",
    userId: "usr_local_demo",
  },
  {
    createdAt: "2026-07-29T16:33:00Z",
    currency: "USD",
    orderNo: "AT-26072903",
    payload: {
      displayCurrency: "USD",
      orderId: "AT-26072903",
      passengers: [{ name: "Danial Hakim", type: "adult" }],
      pnrList: ["BKK7QP"],
      segments: [
        {
          airline: "Malaysia Airlines",
          arrival: "2026-08-10T09:05:00Z",
          departure: "2026-08-10T07:50:00Z",
          destination: { city: "Bangkok", code: "BKK", country: "TH" },
          flightNumber: "MH782",
          origin: KUL,
        },
      ],
      totalPrice: "245.80",
    } satisfies SeedBookingPayload,
    pnr: "BKK7QP",
    status: "refunded",
    totalAmount: "245.80",
    updatedAt: "2026-08-08T10:22:00Z",
    userId: "usr_local_demo",
  },
  {
    createdAt: "2026-08-01T08:57:00Z",
    currency: "USD",
    orderNo: "AT-26080119",
    payload: {
      displayCurrency: "USD",
      orderId: "AT-26080119",
      passengers: [
        { name: "Amirah Dzulkifli", type: "adult" },
        { name: "Zulkifli Amin", type: "adult" },
      ],
      pnrList: [],
      segments: [
        {
          airline: "Malaysia Airlines",
          arrival: "2026-08-28T13:15:00Z",
          departure: "2026-08-28T10:20:00Z",
          destination: { city: "Denpasar", code: "DPS", country: "ID" },
          flightNumber: "MH851",
          origin: KUL,
        },
      ],
      totalPrice: "398.40",
    } satisfies SeedBookingPayload,
    pnr: null,
    status: "voided",
    totalAmount: "398.40",
    updatedAt: "2026-08-02T09:30:00Z",
    userId: "usr_local_demo",
  },
  {
    createdAt: "2026-08-18T13:20:00Z",
    currency: "USD",
    orderNo: "AT-26081833",
    payload: {
      displayCurrency: "USD",
      orderId: "AT-26081833",
      passengers: [{ name: "Amirah Dzulkifli", type: "adult" }],
      pnrList: ["LHQ83Z"],
      segments: [
        {
          airline: "Malaysia Airlines",
          arrival: "2026-12-10T12:30:00Z",
          departure: "2026-12-10T00:15:00Z",
          destination: { city: "London", code: "LHR", country: "GB" },
          flightNumber: "MH2",
          origin: KUL,
        },
        {
          airline: "Malaysia Airlines",
          arrival: "2026-12-28T07:20:00Z",
          departure: "2026-12-27T15:05:00Z",
          destination: KUL,
          flightNumber: "MH3",
          origin: { city: "London", code: "LHR", country: "GB" },
        },
      ],
      totalPrice: "1620.90",
    } satisfies SeedBookingPayload,
    pnr: "LHQ83Z",
    status: "issued",
    totalAmount: "1620.90",
    updatedAt: "2026-08-18T13:45:00Z",
    userId: "usr_local_demo",
  },
  {
    createdAt: "2026-08-20T18:40:00Z",
    currency: "USD",
    orderNo: "AT-26082055",
    payload: {
      displayCurrency: "USD",
      orderId: "AT-26082055",
      passengers: [
        { name: "Amirah Dzulkifli", type: "adult" },
        { name: "Danial Hakim", type: "adult" },
      ],
      pnrList: ["SYD2RT"],
      segments: [
        {
          airline: "Malaysia Airlines",
          arrival: "2026-09-26T05:55:00Z",
          departure: "2026-09-25T21:45:00Z",
          destination: { city: "Sydney", code: "SYD", country: "AU" },
          flightNumber: "MH122",
          origin: KUL,
        },
      ],
      totalPrice: "1476.00",
    } satisfies SeedBookingPayload,
    pnr: "SYD2RT",
    status: "confirmed",
    totalAmount: "1476.00",
    updatedAt: "2026-08-20T18:52:00Z",
    userId: "usr_local_demo",
  },
];
