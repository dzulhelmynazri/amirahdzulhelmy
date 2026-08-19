---
kind: configuration_system
name: Zod-Validated Environment Configuration via @t3-oss/env
category: configuration_system
scope:
  - "**"
source_files:
  - packages/env/src/server.ts
  - packages/env/src/web.ts
  - packages/env/package.json
  - apps/web/next.config.ts
  - apps/runtime/.env
  - apps/runtime/.env.example
  - apps/web/.env
  - packages/config/tsconfig.base.json
---

## Overview

Atlas uses a centralized, type-safe environment configuration system built on `@t3-oss/env` (core + nextjs adapters) with Zod schemas. The shared package `@atlas/env` exposes two entry points — `server` and `web` — so server-side code and client-side code each import only the variables they are allowed to access.

## Key files and packages

- `packages/env/src/server.ts` — Server-side env schema: defines all runtime-required variables (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_*`, `COMPOSIO_API_KEY`, `ATLAS_*`, `RUNTIME_URL`, `TELEGRAM_*`, `AI_GATEWAY_API_KEY`, `CORS_ORIGIN`) with Zod validators, plus `NODE_ENV` defaulting to `development`. Uses `createEnv` from `@t3-oss/env-core` with `runtimeEnv: process.env` and `emptyStringAsUndefined: true`.
- `packages/env/src/web.ts` — Client-side env schema: exposes only `NEXT_PUBLIC_APP_URL` (optional URL) via `@t3-oss/env-nextjs`'s `createEnv`, explicitly whitelisting `process.env.NEXT_PUBLIC_APP_URL` in `runtimeEnv`.
- `packages/env/package.json` — Declares exports `./server` and `./web`; depends on `@t3-oss/env-core`, `@t3-oss/env-nextjs`, `dotenv`, `zod`.
- `apps/runtime/.env` and `apps/runtime/.env.example` — Runtime-specific secrets (Twilio, Telegram, Atlas API keys, Composio, OpenAI).
- `apps/web/.env` — Web app secrets (Better Auth, Google OAuth, Neon DB, Telegram, WhatsApp, AI Gateway, Atlas client credentials, Composio).
- `apps/web/next.config.ts` — Imports `env` from `@atlas/env/server` at build time to configure Next.js rewrites (`RUNTIME_URL`).
- `packages/config/tsconfig.base.json` — Shared TypeScript base config used by workspace packages; not an application config loader but part of the shared config package surface.

## Architecture and conventions

1. **Single source of truth for env shape**: All environment variables are declared once in `packages/env/src/server.ts` (and `web.ts` for client-only vars). Consumers never read `process.env` directly — they `import { env } from "@atlas/env/server"` or `"@atlas/env/web"`.
2. **Server/client separation**: The dual export pattern enforces that client bundles cannot accidentally include server-only secrets. Only variables prefixed `NEXT_PUBLIC_` are exposed to the browser via `web.ts`.
3. **Validation at startup**: `createEnv` validates every required variable against its Zod schema when the module loads. Missing or invalid values cause a validation error before the app starts. `NODE_ENV` defaults to `development` if absent.
4. **Optional empty-string handling**: `emptyStringAsUndefined: true` treats blank `.env` entries as missing rather than empty strings, surfacing them as validation failures.
5. **Skip validation flag**: Both entry points honor `SKIP_ENV_VALIDATION` to bypass validation (useful for local dev or CI where some secrets may be absent).
6. **Per-app `.env` files**: Each app directory (`apps/runtime`, `apps/web`) carries its own `.env` (with secrets) and `.env.example` (template). The runtime app's `.env.example` documents Twilio and Telegram variables; the web app's `.env` lists all secrets including DB, OAuth, and third-party API keys.
7. **Consumers across the monorepo**: The env package is consumed by multiple workspace packages — `apps/web`, `packages/auth`, `packages/db`, `packages/atlas`, `packages/api` — all importing `@atlas/env/server` to get typed, validated config.
8. **Build-time vs runtime**: Next.js reads `RUNTIME_URL` from `@atlas/env/server` inside `next.config.ts` at build time to generate rewrite rules pointing to the deployed runtime endpoint.

## Conventions and constraints

- **All env variables must be declared in the schema** — any new secret must be added to `server.ts` with an appropriate Zod validator (e.g., `.url()`, `.min(1)`, `.enum([...])`) so consumers get compile-time guarantees.
- **Client code must use `@atlas/env/web`** — only `NEXT_PUBLIC_*` variables are whitelisted there; adding a variable to the client bundle requires explicit opt-in in `web.ts`.
- **Secrets live per-app `.env` files**, not in version control (`.env` is gitignored; `.env.example` contains placeholders).
- **`NODE_ENV` defaults to `development`** if not set, so apps run in development mode by default when no environment is configured.
- **Empty strings are treated as missing** — leaving a field blank in `.env` will trigger a validation failure rather than silently passing an empty value.
- **Validation can be disabled globally** via `SKIP_ENV_VALIDATION=true`, which both server and web entry points respect.
