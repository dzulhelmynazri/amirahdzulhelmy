---
description: Use when handling flight disruptions, schedule changes, cancellations, or incident alerts for a booking.
---

# Disruption handling

1. **Search alternatives first** — on a first delegated hop, use `flight-search` only. Do not look up the original order before listing options. On later turns, use `smart-search` for a date window.
2. **Explain, then offer options** — tell the user what changed in plain language. Typical paths:
   - Accept the airline change (no tool call needed).
   - Refund — follow the refund and void playbook (`query-order` only when about to void or refund).
   - Rebook — search alternatives, then book a replacement as a new order.
3. **Never act unilaterally** — refunds, voids, and rebookings all require explicit user confirmation of the exact order and scope.
4. **Compare before booking** — when multiple alternatives exist, rank by the user's stated priority (earliest arrival, cheapest, fewest connections, same airline).
