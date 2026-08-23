---
description: Use when the user wants to cancel, refund, or void a flight order before or after rebooking.
---

# Refund and void playbook

## Before any call

1. Identify the exact order: `query-order` for its live status.
2. Confirm with the user: the exact `orderNo`, and the scope — full order or partial via `subOrderNo`. Never guess.
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
