---
kind: error_handling
name: "Error Handling in Atlas Monorepo: tRPC TRPCError, Plain Errors, and Agent Error Codes"
category: error_handling
scope:
  - "**"
source_files:
  - packages/api/src/index.ts
  - packages/api/src/context.ts
  - apps/web/src/utils/trpc.ts
  - apps/web/src/app/api/trpc/[trpc]/route.ts
  - apps/web/src/app/actions/composio.ts
  - apps/runtime/agent/tools/composio.ts
  - packages/atlas/src/client.ts
  - .agents/skills/atlas-flight-booking/references/error-handling.md
---

## What system/approach is used

The codebase uses a mixed error-handling approach depending on the layer:

- **tRPC API layer** (`packages/api`): Uses `@trpc/server`'s built-in `TRPCError`. Authorization failures are thrown via `protectedProcedure` middleware with a stable `code: "UNAUTHORIZED"`, a `cause`, and a user-facing `message`.
- **Server actions & runtime tools** (`apps/web/src/app/actions`, `apps/runtime/agent/tools`): Throw plain `new Error("...")` strings (e.g. `"Unauthorized"`, `"User ID not found in session"`, `"Failed to generate Composio connection URL"`).
- **Atlas external API client** (`packages/atlas/src/client.ts`): Wraps HTTP responses; when `response.ok` is false it throws a generic `Error` that includes the status code and response body JSON.
- **Frontend error presentation** (`apps/web/src/utils/trpc.ts`): A global React Query `QueryCache.onError` handler displays `error.message` via `sonner.toast.error` with a retry action that invalidates the failed query.
- **Agent-facing error codes**: The file `.agents/skills/atlas-flight-booking/references/error-handling.md` defines a normalized set of error codes (`AUTHORIZATION_REQUIRED`, `SUBSCRIPTION_REQUIRED`, `SEARCH_NO_RESULTS`, `PAYMENT_BALANCE_CHECK_REQUIRED`, etc.) that the agent must branch on by `code` — never parse `message` — and treat as the contract for how upstream errors should be surfaced to users.

There is no centralized custom error class hierarchy, no `try/catch` blocks around most async calls, and no `panic`/`recover` usage (this is a Bun/Node-style JS repo).

## Key files and packages

- `packages/api/src/index.ts` — Defines `publicProcedure` / `protectedProcedure`; `protectedProcedure` throws `TRPCError({ code: "UNAUTHORIZED", cause: "No session", message: "Authentication required" })`.
- `packages/api/src/context.ts` — Builds the tRPC context by calling `auth.api.getSession`; missing sessions surface as `UNAUTHORIZED` via the middleware above.
- `apps/web/src/utils/trpc.ts` — Global React Query error handler that shows `error.message` in a toast with a retry button.
- `apps/web/src/app/api/trpc/[trpc]/route.ts` — tRPC fetch adapter wiring Next.js requests into the router; no per-request error transformation.
- `apps/web/src/app/actions/composio.ts` — Server actions that throw plain `Error("Unauthorized")` or `Error("Failed to generate Composio connection URL")` when auth/session checks fail.
- `apps/runtime/agent/tools/composio.ts` — Tool factory that throws `Error("User ID not found in session")` if the session lacks a principal.
- `packages/atlas/src/client.ts` — `AtlasClient.post` throws `Error(\`Atlas API error ${status}: ...\`)` for non-2xx responses.
- `.agents/skills/atlas-flight-booking/references/error-handling.md` — Authoritative reference enumerating normalized error codes and prescribed agent behavior per code.

## Architecture and conventions

1. **Authorization is enforced centrally in tRPC.** The `protectedProcedure` middleware in `packages/api/src/index.ts` rejects any request without a session using `TRPCError` with code `UNAUTHORIZED`. Routers themselves (e.g. `user.ts`) do not re-check auth — they rely on this middleware.

2. **Server actions use plain `Error` strings.** There is no shared error type for server actions; callers check `session?.user` and throw short string messages like `"Unauthorized"`. This is consistent across `connectIntegration` and `disconnectIntegration`.

3. **External API errors are collapsed into generic `Error`s.** `AtlasClient.post` does not distinguish between 4xx and 5xx — it only checks `response.ok` and throws one `Error` containing both status and body. Callers have no structured way to branch on specific upstream error codes from this client.

4. **Frontend surfaces errors via React Query's global handler.** The single `onError` callback in `queryClient` reads `error.message` and renders it through `sonner.toast.error`. There is no per-procedure error handling in the web app shown here; the UI relies on this global fallback.

5. **Agent-facing errors follow a normalized code contract.** The skill reference explicitly states: _"Branch on `code`; never parse `message`. Keep internal causes out of user-facing output."_ It maps each normalized code (e.g. `AUTHORIZATION_REQUIRED`, `SUBSCRIPTION_REQUIRED`, `PRICE_CHANGED`, `PAYMENT_BALANCE_CHECK_REQUIRED`) to a prescribed agent action (retry once, stop, ask user, show link). This is the only place in the repo where a stable, documented error-code taxonomy exists.

6. **No custom error classes or error middleware exist.** There are no `class X extends Error` definitions, no Zod `z.coerce` validation wrappers, and no global `try/catch` handlers around route handlers. Errors propagate upward until caught by the framework (tRPC) or the caller.

## Conventions and constraints

- **Use `TRPCError` with a stable `code` for tRPC procedures.** Observed in `protectedProcedure` (`code: "UNAUTHORIZED"`). This is the only place in the codebase that sets a typed tRPC error code; other procedures currently return data directly and rely on the middleware for auth errors.
- **Do not expose internal service codes to users.** The agent skill reference forbids exposing numeric HTTP statuses (e.g. upstream `411`) to the user; instead it normalizes them to domain codes like `PAYMENT_BALANCE_CHECK_REQUIRED`.
- **Never parse error messages in agent logic.** The reference explicitly says to branch on `code` and keep internal causes out of user-facing output.
- **Retry policy is constrained.** For agent flows, `retryable=true` permits at most one retry of an identical read-only command and never authorizes a second order creation or payment attempt.
- **Server actions guard auth before calling third-party APIs.** Both `connectIntegration` and `disconnectIntegration` call `auth.api.getSession` and throw `Error("Unauthorized")` if no user is present before invoking Composio.
- **Frontend error display is uniform.** All tRPC client errors bubble into the single `QueryCache.onError` handler, which always renders `error.message` via `sonner.toast.error` with a retry action.
