---
kind: external_dependency
name: Twilio SMS/Voice channel
slug: twilio
category: external_dependency
category_hints:
  - vendor_identity
scope:
  - "**"
---

### Twilio

- Channel integration for the Eve runtime consuming Twilio's SMS/Voice APIs. Credentials (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`) are loaded from environment variables and wired into the Twilio channel under `apps/runtime/agent/channels/twilio.ts`.
