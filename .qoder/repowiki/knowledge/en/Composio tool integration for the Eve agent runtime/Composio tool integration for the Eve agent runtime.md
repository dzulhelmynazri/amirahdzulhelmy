---
kind: external_dependency
name: Composio tool integration for the Eve agent runtime
slug: composio
category: external_dependency
category_hints:
  - vendor_identity
  - framework_behavior
scope:
  - "**"
---

### Composio

- Declared in `apps/runtime/package.json` as `@composio/core` and `@composio/experimental`; configured via `COMPOSIO_API_KEY` in `.env`.
- This is the mechanism used to surface third-party app actions (beyond the built-in channels) to the AI agent at runtime.
