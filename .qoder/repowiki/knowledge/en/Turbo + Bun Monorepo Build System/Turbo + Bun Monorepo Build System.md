---
kind: build_system
name: Turbo + Bun Monorepo Build System
category: build_system
scope:
  - "**"
source_files:
  - package.json
  - turbo.json
  - apps/web/package.json
  - apps/runtime/package.json
  - apps/web/next.config.ts
  - packages/db/package.json
  - packages/ui/package.json
  - oxlint.config.ts
  - oxfmt.config.ts
  - .husky/pre-commit
---

## Overview

Atlas is a **Bun-powered Turborepo monorepo** that orchestrates two applications (`apps/web` — Next.js frontend, `apps/runtime` — Eve agent runtime) and six shared packages (`packages/api`, `packages/atlas`, `packages/auth`, `packages/config`, `packages/db`, `packages/env`, `packages/ui`) through a single build graph. There are no Makefiles, Dockerfiles, or shell-based build scripts; all orchestration flows through `turbo run` commands defined in the root `package.json`.

## Toolchain & Entry Points

- **Package manager**: Bun `1.3.14` (declared via `packageManager` field); lockfile is `bun.lock`. Node engine is pinned to `24.x`.
- **Task runner**: Turborepo `^2.10.9` with TUI output (`ui: "tui"`). Root scripts delegate everything to Turbo:
  - `npm run dev` → `turbo run dev`
  - `npm run build` → `turbo run build`
  - `npm run check-types` → `turbo run check-types`
  - Database tasks (`db:push`, `db:generate`, `db:migrate`, `db:studio`) are scoped to `@atlas/db` via `-F @atlas/db`.
- **Linting/formatting**: `ultracite` (v7.9.4) wraps `oxlint` and `oxfmt`; configured via `oxlint.config.ts` and `oxfmt.config.ts` at the repo root.
- **Pre-commit hooks**: Husky installed via `prepare` script; the `pre-commit` hook lives under `.husky/pre-commit`.

## Task Graph & Caching

`turbo.json` defines the canonical task graph:

| Task | Dependencies | Caching | Notes |
| --- | --- | --- | --- |
| `build` | `^build` (topological) | Enabled; outputs `dist/**`, `.next/**` (excludes `.next/cache`) |
| `lint` | `^lint` | Default |
| `check-types` | `^check-types` | Default |
| `dev` | none | Disabled (`cache: false`), marked `persistent: true` |
| `db:*` | none | Disabled; `db:migrate`/`db:studio` also `persistent: true` |

Global environment variables required by tasks are declared in `globalEnv` (e.g. `DATABASE_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `TELEGRAM_BOT_TOKEN`, `RUNTIME_URL`, `AI_GATEWAY_API_KEY`). The `build` task additionally watches `.env*` files as inputs so env changes invalidate the cache.

## Per-App / Package Conventions

- **`apps/web` (Next.js)**: Uses Next.js App Router with React Compiler enabled (`reactCompiler: true`), Turbopack Rust React compiler experimental flag, component caching, partial prefetching, and rewrites `/api/eve/*` to `${RUNTIME_URL}/eve/*`. Build is `next build`; type-check is `tsc --noEmit`.
- **`apps/runtime` (Eve agent)**: Build/dev/start are delegated to the `eve` CLI (`eve build`, `eve dev`, `eve start`). Imports alias `#*` → `./agent/*` and `#evals/*` → `./evals/*` for internal module resolution.
- **Shared packages** follow a uniform pattern: each package declares its own `scripts` (e.g. `@atlas/db` exposes `db:push`, `db:generate`, `db:studio`, `db:migrate` via `drizzle-kit`; `@atlas/ui` exposes `check-types`). Packages use `workspace:*` references to consume other workspace packages, and many dependencies are pinned via the root `catalog` section of `package.json` (e.g. `next`, `react`, `zod`, `typescript`, `tailwindcss`, `better-auth`).
- **TypeScript**: Each package has its own `tsconfig.json`; the root `tsconfig.json` provides shared base config consumed by `@atlas/config`.

## Environment & Secrets

- Runtime secrets flow through Turborepo's `globalEnv` list; individual apps also ship `.env` / `.env.example` files (e.g. `apps/runtime/.env`, `apps/web/.env`).
- The `@atlas/env` package (referenced by multiple packages) validates server/client environment variables using Zod via `@t3-oss/env`, providing typed access to configuration.

## Versioning & Publishing

- All packages use local version strings (`0.0.0` or `0.1.0`) and resolve cross-package dependencies via `workspace:*`; there is no npm publish step, version bump script, or changelog automation visible in the repository. The project is treated as an internal monorepo rather than a published library set.

## CI / Deployment

No CI pipeline (e.g. GitHub Actions, GitLab CI) or containerization (Dockerfile) was found in the repository. The only deployment hint is `apps/runtime/.vercelignore`, suggesting the runtime may be deployed to Vercel, but no workflow file exists here to describe how builds are triggered remotely.

## Key Files

- `package.json` — root workspaces, catalog, scripts, engines, packageManager
- `turbo.json` — task graph, caching rules, global env, persistent tasks
- `apps/web/package.json` — Next.js app scripts (`dev`, `build`, `start`, `check-types`)
- `apps/runtime/package.json` — Eve CLI scripts (`build`, `dev`, `start`, `typecheck`)
- `apps/web/next.config.ts` — Next.js build-time config (rewrites, compiler flags, image domains)
- `packages/db/package.json` — Drizzle CLI entry points (`db:push`, `db:generate`, `db:migrate`, `db:studio`)
- `packages/ui/package.json` — Shared UI package exports and type-check script
- `oxlint.config.ts`, `oxfmt.config.ts` — Lint/format configuration at repo root
- `.husky/pre-commit` — Pre-commit hook entry point
