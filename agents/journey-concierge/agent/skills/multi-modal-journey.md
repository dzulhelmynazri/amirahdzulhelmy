---
description: Use when coordinating ground transfers, hotel timing, calendar updates, or multi-leg journeys around a flight.
---

# Multi-modal journey planning

## After a flight lands

1. **Get arrival details** — `query-order` or `extract-pnr` for airport, terminal, scheduled/actual arrival time.
2. **Check ground options** — Google Maps for:
   - Airport → hotel travel time
   - Airport → train station (e.g. last train departure)
   - Alternate airport if rebooked (e.g. Haneda vs Narita)
3. **Flag risks** — tight connections, late-night arrivals with no transit, long immigration queues at peak hours.

## Calendar coordination

- Create flight events with correct timezone and airport codes.
- Add buffer events: "Leave for airport", "Immigration + baggage", "Ground transfer to hotel".
- Update hotel check-in reminders when arrival time shifts (disruption scenario).

## Gmail context

- Use `email-query` or Gmail tools to find hotel confirmations, train tickets, or car rentals not in the flight PNR.
- Cross-reference dates and locations with the flight itinerary.

## Handoff

- Flight booking or rebooking → call **booking-agent** or **rebook-agent**
- Disruption alerts → call **disruption-guard**
- Complex route alternatives → call **routing-agent**

## Presentation

Present a simple timeline:

```
22:30  Land HND Terminal 3
22:45  Immigration + baggage (~45 min)
23:30  Keikyu Line to Shinagawa (~20 min)
23:50  Taxi to hotel (~15 min)
00:05  Arrive hotel — late check-in confirmed
```

Call out anything the user must do manually (buy train ticket, confirm late check-in).
