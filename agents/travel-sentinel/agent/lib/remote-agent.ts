import { defineRemoteAgent } from "eve";
import { vercelOidc } from "eve/agents/auth";
import type { OutboundAuthFn } from "eve/agents/auth";

const SPECIALISTS = {
  "booking-agent":
    "Books new flights end-to-end: search, verify, optional seats or bags, create order, confirm, pay, and track. Use for first-time bookings, not disruption recovery.",
  "disruption-guard":
    "Monitors booked trips for delays, cancellations, and schedule changes, then explains what changed. Does not rebook or refund.",
  "flight-guardian":
    "Atlas front door. Routes booking, rebooking, routing and concierge work to its internal specialists. Send it a complete task message.",
  "journey-concierge":
    "Connects flights to ground transport, hotel timing, Gmail, Calendar, and Maps. Does not book or rebook flights.",
  "rebook-agent":
    "Recovers disrupted trips: search replacements, book a new order, then void or refund the original. Use after a delay or cancellation.",
  "routing-agent":
    "Finds alternative routes, connections, airports, and dates. Read-only. Returns a routingIdentifier for booking-agent or rebook-agent.",
} as const;

export type AtlasSpecialist = keyof typeof SPECIALISTS;

const atlasAgentOrigin = (): string => {
  const origin = process.env.NEXT_PUBLIC_APP_URL as string;

  return origin.endsWith("/") ? origin.slice(0, -1) : origin;
};

const vercelOidcAuth = vercelOidc();

const outboundAuth: OutboundAuthFn = () => {
  if (process.env.VERCEL) {
    return vercelOidcAuth();
  }
  return Promise.resolve({ headers: {} });
};

export const defineAtlasRemoteAgent = (name: AtlasSpecialist) =>
  defineRemoteAgent({
    auth: outboundAuth,
    description: SPECIALISTS[name],
    forwardPrincipal: true,
    url: () => `${atlasAgentOrigin()}/eve/agents/${name}`,
  });
