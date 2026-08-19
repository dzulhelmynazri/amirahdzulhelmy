---
description: Use when the user searches flights with flexible dates, asks for the cheapest day to fly, or wants fare comparison across dates.
---

# Flexible fare search

- **Exact dates** — use `flight-search`. No skill needed beyond the normal booking workflow.
- **Flexible dates** ("around these dates", "+/- 3 days", "cheapest weekend") — use `smart-search`, which accepts flight-search style inputs with flexible date handling.
- **Fare comparison across dates** ("which day is cheapest", "compare this week") — use `price-compare-search`, which compares fares across dates for a single route.

## Rules

1. Confirm route, rough date window, and passenger counts before searching.
2. Present results as a short ranked list: date, fare, and the key trade-off (duration, stops). Do not dump raw routing payloads.
3. When the user picks an option, continue with the standard booking workflow starting at `flight-verify` using the selected offer's `routingIdentifier`.
4. Both tools are read-only and safe to repeat with refined parameters if the first window returns nothing usable.
