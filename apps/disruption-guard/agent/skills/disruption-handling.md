---
description: Use when handling flight disruptions, schedule changes, cancellations, or incident alerts for a booking.
---

# Disruption handling

1. **Triage** — call `webhook-incidents` filtered as narrowly as possible (`orderNo`, `pnr`, or a time window). Read-only; safe to repeat.
2. **Verify current state** — for each affected order, call `query-order` to confirm ticketing status and the live itinerary before proposing anything.
3. **Get booking detail** — if the incident references a PNR you manage, use `extract-pnr` to read the booking details. Pass identifying fields exactly as received from prior API responses.
4. **Explain, then offer options** — tell the user what changed (old vs new times/segments) in plain language. Typical options:
   - Accept the change (no tool call needed).
   - Refund — tell the user you cannot process refunds here; they should confirm with support or use the rebook flow if a replacement is preferred.
   - Rebook — call **rebook-agent** with the `orderNo`, route, passengers, and what changed so it can search alternatives and book a replacement. A new booking is a new order, never a modification of the old one.
5. **Never act unilaterally** — you only monitor, explain, and recommend. Rebooking and refunds still require the traveler to confirm with **rebook-agent**.
6. **Proactive alerts** — when reporting a new incident, lead with what changed, who is affected, and the three options (accept, rebook, refund inquiry).
