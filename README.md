# Atlas by AmirahDzulhelmy

Proactive flight agents that watch trips, detect disruptions, and recover journeys — built on Next.js, eve, and the Atlas Flight Booking API.

**Flight Guardian** (`apps/web`) is the UI. Five focused eve agents handle monitoring, rebooking, routing, booking, and multi-modal trip coordination.

## Stack

- **TypeScript** — type safety across the monorepo
- **Next.js** — web app + eve agent hosting via `withEve`
- **eve** — durable AI agents (schedules, channels, tools)
- **tRPC** — end-to-end type-safe APIs
- **Drizzle + PostgreSQL** — database
- **Better Auth** — authentication
- **shadcn/ui** — shared components in `packages/ui`
- **Turborepo + Ultracite** — builds, lint, format

## Getting started

Install dependencies:

```bash
bun install
```

Set up environment (one `.env` at the repo root, symlinked into each app):

```bash
cp .env.example .env
# fill in secrets
bun run env:link
```

Set up the database:

```bash
bun run db:push
```

Run the dev server:

```bash
bun run dev
```

Open [http://localhost:3001](http://localhost:3001).

Agents are mounted at `/eve/agents/<name>/eve/v1/*`. See [`.plan/agent.md`](.plan/agent.md) for roles, tools, and demo flow.

## UI customization

Shared shadcn/ui primitives live in `packages/ui`.

- Design tokens: `packages/ui/src/styles/globals.css`
- Components: `packages/ui/src/components/*`
- shadcn config: `packages/ui/components.json`, `apps/web/components.json`

Add shared components from the repo root:

```bash
npx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

```tsx
import { Button } from "@atlas/ui/components/button";
```

## Project structure

```
atlas/
├── apps/
│   ├── web/                  # Next.js UI (Flight Guardian)
│   └── */                    # eve agents (see .plan/agent.md)
├── packages/
│   ├── atlas/                # Atlas Flight API client
│   ├── api/                  # tRPC / business logic
│   ├── auth/                 # Better Auth
│   ├── db/                   # Drizzle schema
│   ├── env/                  # Env validation
│   └── ui/                   # Shared UI
├── .env.example              # Canonical env template
└── scripts/link-env.sh       # Symlink root .env into apps
```

## Scripts

| Command               | Description                       |
| --------------------- | --------------------------------- |
| `bun run dev`         | Start all apps in development     |
| `bun run dev:web`     | Web app only                      |
| `bun run build`       | Build all apps                    |
| `bun run check-types` | Typecheck across the monorepo     |
| `bun run env:link`    | Symlink root `.env` into each app |
| `bun run db:push`     | Push schema to database           |
| `bun run db:migrate`  | Run migrations                    |
| `bun run db:studio`   | Open Drizzle Studio               |
| `bun run check`       | Lint and format (Ultracite)       |
| `bun run fix`         | Auto-fix lint/format issues       |
