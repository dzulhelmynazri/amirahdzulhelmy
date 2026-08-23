---
description: Use when comparing route alternatives after a disruption, evaluating connections, alternate airports, or ranking options by price, speed, or stops.
---

# Intelligent routing

## When the direct path fails

1. **Check bookability** — `route-export` to see supported routes; consider nearby airports (e.g. NRT vs HND, ORD vs MDW).
2. **Search alternatives** — for each viable path:
   - Same city pair, different dates → `smart-search` or `price-compare-search`
   - Specific date, different connection → `flight-search` with connection cities in mind
3. **Rank results** — always present at least two options when available:
   - **Cheapest** — lowest total fare
   - **Fastest** — shortest total travel time
   - **Fewest connections** — fewest stops or segments
   - **Same airline** — keeps loyalty benefits and interline risk low

## Presentation rules

- One line per option: route, date, price, duration, stops, airline.
- Call out tradeoffs explicitly ("2h longer but $180 cheaper", "one extra stop but arrives 4h earlier").
- If no good options exist in the first window, widen dates or try an alternate airport before giving up.

## Handoff

- Routing ends at option selection. Call **booking-agent** or **rebook-agent** with the chosen `routingIdentifier` and traveler details — do not ask the user to switch agents.
