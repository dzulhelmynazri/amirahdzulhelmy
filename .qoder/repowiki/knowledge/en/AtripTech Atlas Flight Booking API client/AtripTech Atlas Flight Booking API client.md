---
kind: external_dependency
name: AtripTech Atlas Flight Booking API client
slug: atriptech-atlas-api
category: external_dependency
category_hints:
  - vendor_identity
  - sdk_real_api
scope:
  - "**"
---

### AtripTech Atlas API

- External flight booking / ticketing backend consumed via the `@atlas/atlas-client` package. The runtime (`apps/runtime`) points at `ATLAS_API_URL=https://sandbox.atriptech.com` with `ATLAS_ACCESS_KEY` / `ATLAS_SECRET_KEY`, which the client injects as `x-atlas-client-id` and `x-atlas-client-secret` headers on every POST.
- All endpoints are POST-only and return a `{ status, msg, ... }` envelope; the client throws on non-OK responses.
- Domain groups: `flights/` (search, verify, offer, seat/baggage, order/confirmOrder, paymentAndTicketing, queryOrder), `post-booking/` (extractPnr, refunds, void, stopTicketIssuance, etc.), `utility/` (atripToken, balance, emailQuery, routeExport), plus `webhook` for `/updateWebhookURL.do` and `/event/getPageList.do`.
- Verify exact endpoint paths and request/response shapes against the official AtripTech Atlas API docs before changing any call site.
