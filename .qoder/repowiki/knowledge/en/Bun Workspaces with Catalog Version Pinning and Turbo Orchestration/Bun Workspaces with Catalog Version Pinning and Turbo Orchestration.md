---
kind: dependency_management
name: Bun Workspaces with Catalog Version Pinning and Turbo Orchestration
category: dependency_management
scope:
  - "**"
source_files:
  - package.json
  - bun.lock
  - turbo.json
  - apps/web/package.json
  - apps/runtime/package.json
  - packages/api/package.json
  - packages/auth/package.json
  - packages/db/package.json
  - packages/env/package.json
  - packages/ui/package.json
---

## Dependency Management System

This is a **Bun monorepo** managed via **Bun workspaces** and **Turbo**, using a centralized **catalog** strategy for version pinning across all packages.

### Toolchain

- **Package manager**: Bun (declared via `packageManager: "bun@1.3.14"` in root `package.json`, enforced by the `engines` field requiring `node: 24.x`).
- **Workspace system**: Bun workspaces, declared at the root under `workspaces.packages` matching `apps/*` and `packages/*`.
- **Lockfile**: `bun.lock` (lockfileVersion 1) — single source of truth for all transitive dependencies across the workspace.
- **Build orchestration**: Turbo (`turbo ^2.10.9`) defines tasks (`build`, `lint`, `check-types`, `dev`, `db:*`) that depend on each other via `dependsOn: ["^task"]` ordering.
- **Internal package registry**: All internal packages are published as `@atlas/*` scoped packages (`@atlas/api`, `@atlas/auth`, `@atlas/db`, `@atlas/env`, `@atlas/ui`, `@atlas/config`, `@atlas/atlas-client`) and consumed via `workspace:*` protocol — no npm registry publishing is configured.

### Centralized Version Catalog

The root `package.json` declares a `workspaces.catalog` block that centralizes versions for shared third-party libraries:

```
"catalog": {
  "dotenv": "^17.4.2",
  "zod": "^4.4.3",
  "typescript": "^6.0.3",
  "lucide-react": "^1.27.0",
  "next": "^16.3.0",
  "react": "^19.2.8",
  "react-dom": "^19.2.8",
  "@trpc/server": "^11.18.0",
  "@trpc/client": "^11.18.0",
  "better-auth": "1.6.25",
  "tailwindcss": "^4.3.3",
  ...
}
```

Consuming packages reference these via the `catalog:` pseudo-version syntax (e.g., `"@trpc/server": "catalog:"`, `"zod": "catalog:"`, `"next": "catalog:"`) rather than repeating version strings. The catalog is also reflected in `bun.lock` under the top-level `catalog` key, which acts as the resolved version map.

### Workspace Package Inter-Dependencies

Internal packages depend on each other exclusively through the `workspace:*` protocol:

- `apps/web` depends on `@atlas/api`, `@atlas/auth`, `@atlas/env`, `@atlas/ui`.
- `apps/runtime` depends on `@atlas/auth`.
- `packages/api` depends on `@atlas/auth`, `@atlas/db`, `@atlas/env`.
- `packages/auth` depends on `@atlas/db`, `@atlas/env`.
- `packages/db`, `packages/env`, `packages/ui` depend on `@atlas/env`.

No private npm registry or `.npmrc`/`.bunfig.toml` registry overrides are present; all external dependencies resolve from the public Bun/npm registry.

### Overrides and Pinned Versions

- A root-level `overrides` field pins `ai` to `^7.0.58` to force a specific version across the dependency tree (also reflected in `bun.lock`'s `overrides` section).
- Some packages still declare explicit versions instead of using `catalog:` (e.g., `packages/atlas` pins `zod` to `^3.23.8`, `apps/runtime` pins `zod` to `4.4.3`), indicating partial migration to the catalog pattern.
- Dev tooling uses `latest` for some dev-only deps (`husky`, `oxfmt`, `oxlint`), while others are pinned (e.g., `ultracite: 7.9.4`).

### Environment & Secrets Handling

- Dependencies do not manage secrets; environment variables are passed into builds via Turbo's `globalEnv` list in `turbo.json` (e.g., `DATABASE_URL`, `BETTER_AUTH_SECRET`, `COMPOSIO_API_KEY`, `GOOGLE_CLIENT_ID`, etc.).
- Per-app `.env` files exist alongside `.env.example` templates but are gitignored.

### Conventions Observed

1. **Shared dependencies go in the root catalog** — new common libraries should be added to `workspaces.catalog` and referenced as `catalog:` from packages.
2. **Internal packages use `workspace:*`** — never publish internal packages to a registry; consume them via workspace resolution.
3. **Single lockfile** — `bun.lock` is committed and authoritative; do not regenerate per-package.
4. **Node engine pinning** — the root `engines.node` field requires `24.x`, ensuring consistent runtime behavior.
5. **Turbo task graph** — cross-package build/lint/type-check ordering is enforced by Turbo's `dependsOn: ["^task"]` convention rather than manual sequencing.
