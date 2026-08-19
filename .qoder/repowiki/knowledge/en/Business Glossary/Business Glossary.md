---
kind: business_term
name: Business Glossary
category: business_term
scope:
  - "**"
---

### routingIdentifier

- Definition：An identifier returned by the Atlas search flow that uniquely references a searched itinerary; passed to `verify` to lock in pricing and obtain a `sessionId` before proceeding to booking.

### PNR

- Definition：Passenger Name Record — the airline reservation record created after ticketing; operations such as `extractPnr`, `pnrClaim`, and post-ticketing ancillaries act on PNRs in the Atlas post-booking workflow.

### confirmationUrl

- Definition：The URL returned by `confirmOrder` that renders the Atlas booking confirmation page; supports an iframe mode and a timeout parameter for embedding within the web app.

### stopTicketIssuance

- Definition：Post-booking operation (`/stopTicketIssuance.do`) that halts automatic ticket issuance for an order, typically invoked when payment or verification fails before the ticket is issued.
- Aliases：stopTicketIssuance1

### void

- Definition：Post-booking operation (`/void.do`) that cancels/voids an existing order or ticketed reservation in the Atlas system.
