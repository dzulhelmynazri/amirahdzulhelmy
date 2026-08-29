---
description: Use when the user searches flights with flexible dates, asks for the cheapest day to fly, or wants fare comparison across dates.
---

# Flexible fare search

- **Exact date** — `flight-search`. No skill needed beyond the normal booking workflow.
- **Any question that spans dates** — "cheapest in September", "+/- 3 days", "which day is cheapest", "cheapest weekend" — use **`fare-scan` once** with the whole window. It sweeps every date concurrently in one call and returns the cheapest fare per day.

**Never probe dates one search at a time.** A measured month-sweep done that way took 13 model steps and 36 search calls; one fare-scan replaces all of it. If the window is longer than 14 days, scan the most plausible weeks rather than iterating single days.

## Rules

1. Search with what you have: route, window, passenger count. Do not interview first.
2. Present the scan as a short ranked list: date, fare, stops. Do not dump raw payloads.
3. Scan prices are comparison-level. When the traveller picks a date, run `flight-search` on that exact date and continue the booking from its result — never book from a scan row.
4. One productive search claims the turn. Work from what it returned; refine on the next turn if needed.
