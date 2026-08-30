---
description: Use when the user wants to cancel, refund, or void a flight order before or after rebooking.
---

# Refund and void playbook

## Before any call

1. Identify the exact order: `query-order` for its live status.
2. Establish the scope — full order, or partial via `subOrderNo`. **Ask only when you were not told.** A traveller who gave the order number and said "in full" has already answered; asking again ends the turn on a question they answered, and the call never happens. The approval prompt under "During" is where confirmation actually happens — it is a gate you cannot bypass, not a step you replace with a question. Never guess a scope you were not given.
3. Know the differences:
   - `void-order` — irreversible and only valid **before ticketing**. Use for never-flown, un-ticketed orders.
   - `refunds` — for ticketed orders; subject to fare rules and may take time to process.

## During

- Each of these tools is approval-gated; let the user approve through the prompt, never work around it.
- Check `balance` first if the refund path involves wallet credit or the earlier payment could not be confirmed.

## After

- If a call fails, **never retry automatically**. Query `query-order` and report the actual state instead.
- A pending refund or pending ticketing is not a failure; explain that processing is ongoing and offer to check again later.
- Report the outcome with the order number and any follow-up the traveler should expect (refund timeline, new PNR from the replacement booking).
