# Getting Started Guide

<cite>
**Referenced Files in This Document**
- [README.md](file://README.md)
- [package.json](file://package.json)
- [turbo.json](file://turbo.json)
- [apps/web/package.json](file://apps/web/package.json)
- [apps/runtime/package.json](file://apps/runtime/package.json)
- [packages/db/package.json](file://packages/db/package.json)
- [packages/env/package.json](file://packages/env/package.json)
- [apps/web/next.config.ts](file://apps/web/next.config.ts)
</cite>

## Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Environment Setup](#environment-setup)
5. [Database Setup](#database-setup)
6. [Development Workflow](#development-workflow)
7. [Starting the Development Servers](#starting-the-development-servers)
8. [Verification](#verification)
9. [Troubleshooting](#troubleshooting)
10. [Next Steps](#next-steps)

## Introduction

This guide helps you set up and run the Atlas project locally with minimal friction. Atlas is a modern TypeScript monorepo built with Next.js, tRPC, Drizzle ORM, PostgreSQL, Better-Auth, and Turborepo. You will install dependencies, configure environment variables, initialize the database, and start both the web application and AI runtime components using Turborepo commands.

## Prerequisites

Ensure your local machine meets these requirements before proceeding:

- Node.js 24.x (as specified by the engines field)
- Bun package manager (recommended; version pinned in the root package manager field)
- A running PostgreSQL server or a managed service (e.g., Neon)
- API keys for authentication providers and external services used by the app and runtime

Key environment variables required by the project include:

- DATABASE_URL
- BETTER_AUTH_SECRET and BETTER_AUTH_URL
- GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
- COMPOSIO_API_KEY
- TELEGRAM_BOT_TOKEN and TELEGRAM_BOT_USERNAME
- RUNTIME_URL
- ATLAS_API_URL, ATLAS_CLIENT_ID, ATLAS_CLIENT_SECRET
- CORS_ORIGIN
- AI_GATEWAY_API_KEY

These are declared as global environment variables in the Turborepo configuration so they are available to all tasks.

**Section sources**

- [package.json:61-65](file://package.json#L61-L65)
- [turbo.json:4-19](file://turbo.json#L4-L19)

## Installation

Install dependencies using the repository’s package manager:

- Run bun install at the project root to bootstrap workspaces and install all packages.

The root scripts orchestrate Turborepo tasks for development, building, type checking, and database operations across apps and packages.

**Section sources**

- [README.md:21-25](file://README.md#L21-L25)
- [package.json:29-40](file://package.json#L29-L40)

## Environment Setup

Create and configure environment files for each app that needs them:

- Copy .env.example to .env in apps/web if provided by the template.
- Set DATABASE_URL to point to your PostgreSQL instance.
- Configure authentication:
  - BETTER_AUTH_SECRET and BETTER_AUTH_URL for Better-Auth.
  - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET for Google OAuth.
- Configure integrations:
  - COMPOSIO_API_KEY for Composio tools.
  - TELEGRAM_BOT_TOKEN and TELEGRAM_BOT_USERNAME for Telegram integration.
- Configure runtime proxying:
  - RUNTIME_URL to route /api/eve/* requests to the AI runtime.
- Optional but recommended:
  - ATLAS_API_URL, ATLAS_CLIENT_ID, ATLAS_CLIENT_SECRET
  - CORS_ORIGIN
  - AI_GATEWAY_API_KEY

Turborepo exposes these variables globally to all tasks via its configuration. The Next.js app rewrites /api/eve/* to the runtime URL configured in RUNTIME_URL.

**Section sources**

- [turbo.json:4-19](file://turbo.json#L4-L19)
- [apps/web/next.config.ts:20-27](file://apps/web/next.config.ts#L20-L27)

## Database Setup

Atlas uses Drizzle ORM with PostgreSQL. Follow these steps:

- Ensure your PostgreSQL server is running and accessible via DATABASE_URL.
- Push the schema to your database:
  - Use the root script to push changes: bun run db:push
- Generate types and client code:
  - Use bun run db:generate
- Run migrations when needed:
  - Use bun run db:migrate
- Explore the database visually:
  - Use bun run db:studio

The database package provides Drizzle CLI commands for push, generate, migrate, and studio.

**Section sources**

- [README.md:27-44](file://README.md#L27-L44)
- [packages/db/package.json:12-17](file://packages/db/package.json#L12-L17)
- [package.json:34-37](file://package.json#L34-L37)

## Development Workflow

Use Turborepo to manage tasks across the monorepo:

- Start all apps in development mode: bun run dev
- Build all apps: bun run build
- Check types across the repo: bun run check-types
- Run linting and formatting: bun run check
- Fix formatting issues automatically: bun run fix
- Initialize Git hooks: bun run prepare

Turborepo caches outputs and ensures dependent tasks run in the correct order. For example, build depends on upstream builds, while dev runs persistently without caching.

**Section sources**

- [package.json:29-40](file://package.json#L29-L40)
- [turbo.json:20-49](file://turbo.json#L20-L49)

## Starting the Development Servers

Start the full stack:

- Run bun run dev to launch all applications defined in the workspace.

Start only the web application:

- Run bun run dev:web to launch the Next.js app on port 3001.

Start the AI runtime:

- From the runtime package, use its dev command to start the agent runtime.

Note: The web app proxies /api/eve/* to the runtime based on RUNTIME_URL. Ensure the runtime is running and reachable at the configured URL.

**Section sources**

- [README.md:40-46](file://README.md#L40-L46)
- [apps/web/package.json:5-10](file://apps/web/package.json#L5-L10)
- [apps/runtime/package.json:9-14](file://apps/runtime/package.json#L9-L14)
- [apps/web/next.config.ts:20-27](file://apps/web/next.config.ts#L20-L27)

## Verification

After setup:

- Open http://localhost:3001 in your browser to verify the web application is running.
- Confirm the runtime is reachable at the URL configured in RUNTIME_URL.
- Verify database connectivity by performing a simple query or opening the DB studio via bun run db:studio.
- Test authentication flows by attempting login with configured providers (e.g., Google).
- Validate environment variables are loaded by checking logs for any missing secret errors.

If the UI loads and you can interact with protected routes, your environment is likely configured correctly.

**Section sources**

- [README.md:40-46](file://README.md#L40-L46)
- [turbo.json:4-19](file://turbo.json#L4-L19)

## Troubleshooting

Common issues and resolutions:

- Missing environment variables:
  - Ensure all required variables from turbo.json are present in your .env files.
  - Confirm TURBO variables are not interfering with local env loading.
- Database connection failures:
  - Verify DATABASE_URL points to a valid PostgreSQL instance.
  - Check network access and credentials.
  - Re-run db:push or db:migrate if schema drift occurs.
- Authentication provider errors:
  - Double-check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.
  - Ensure BETTER_AUTH_URL matches your local dev URL scheme and host.
- Runtime proxy not working:
  - Confirm RUNTIME_URL is set and the runtime process is running.
  - Check that /api/eve/* rewrites are active in the Next.js config.
- Package manager or Node version mismatch:
  - Use Node 24.x and Bun as specified in the root package configuration.
- Linting/formatting issues:
  - Run bun run check to identify problems and bun run fix to auto-correct where possible.

**Section sources**

- [turbo.json:4-19](file://turbo.json#L4-L19)
- [apps/web/next.config.ts:20-27](file://apps/web/next.config.ts#L20-L27)
- [package.json:61-65](file://package.json#L61-L65)

## Next Steps

Explore the codebase and contribute:

- Review the project structure overview in the README to understand apps and packages.
- Add shared UI components via the shadcn workflow described in the README.
- Use Turborepo tasks to iterate quickly on specific parts of the system.
- Refer to the skills and references under .agents/skills for guidance on best practices and tooling.

**Section sources**

- [README.md:79-106](file://README.md#L79-L106)
