---
kind: frontend_style
name: Tailwind CSS + shadcn/ui Design System with OKLCH Theme Tokens
category: frontend_style
scope:
  - "**"
source_files:
  - packages/ui/src/styles/globals.css
  - packages/ui/package.json
  - packages/ui/src/lib/utils.ts
  - packages/ui/src/hooks/use-mobile.ts
  - packages/ui/src/components/button.tsx
  - apps/web/components.json
  - apps/web/postcss.config.mjs
  - apps/web/src/index.css
  - apps/web/src/components/theme-provider.tsx
  - apps/web/package.json
---

## What system/approach is used

The Atlas monorepo uses a **Tailwind CSS v4** styling approach built on top of **shadcn/ui** (configured via `@shadcn/react` and the `shadcn` CLI) to provide a shared, themeable component library. The design system is centralized in the `@atlas/ui` package and consumed by the `apps/web` Next.js application. Styling is driven entirely by **CSS custom properties (design tokens)** defined in `oklch()` color space, with dark mode toggled via a `.dark` class. Components are composed using **Base UI primitives** (`@base-ui/react`) wrapped in shadcn-style React components, with variants managed through **class-variance-authority (cva)** and class merging via **clsx + tailwind-merge**.

## Key files and packages

- `packages/ui/src/styles/globals.css` — Single source of truth for Tailwind imports (`tailwindcss`, `tw-animate-css`, `shadcn/tailwind.css`), design token variables (light/dark palettes, radii, chart colors, sidebar tokens), `@theme inline` mapping, and base layer resets.
- `packages/ui/package.json` — Declares `@atlas/ui` as an internal package exposing `./globals.css`, `./components/*`, `./lib/*`, `./hooks/*`; depends on `@base-ui/react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`, `next-themes`, `sonner`, `recharts`, `cmdk`, `embla-carousel-react`, etc.
- `packages/ui/src/lib/utils.ts` — Exposes the shared `cn(...)` utility that merges classes with `clsx` + `tailwind-merge`.
- `packages/ui/src/hooks/use-mobile.ts` — Shared breakpoint hook using `matchMedia` with a `MOBILE_BREAKPOINT = 768` constant.
- `packages/ui/src/components/button.tsx` — Canonical example of a shadcn-style component: wraps a Base UI primitive, defines `cva` variants (`variant`: default/outline/secondary/ghost/destructive/link; `size`: default/xs/sm/lg/icon/icon-xs/icon-sm/icon-lg), applies `data-slot="button"`, and composes classes via `cn(buttonVariants({ variant, size, className }))`.
- `apps/web/components.json` — shadcn configuration pointing at `../../packages/ui/src/styles/globals.css` as the Tailwind CSS file, `baseColor: "neutral"`, `cssVariables: true`, `iconLibrary: "hugeicons"`, aliases mapping `@/components` → `@atlas/ui/components`, `@/utils` → `@atlas/ui/lib/utils`, `@/ui` → `@atlas/ui/components`.
- `apps/web/postcss.config.mjs` — Uses `@tailwindcss/postcss` plugin (Tailwind v4 PostCSS integration).
- `apps/web/src/index.css` — Minimal entry that only `@import`s `@atlas/ui/globals.css`, keeping the app shell free of style concerns.
- `apps/web/src/components/theme-provider.tsx` — Thin wrapper around `next-themes`'s `ThemeProvider` for light/dark mode switching.
- `apps/web/package.json` — Declares `@atlas/ui` as a workspace dependency alongside Next.js, tRPC, Better Auth, TanStack Query, Sonner, etc.

## Architecture and conventions

1. **Centralized design tokens**: All colors, radii, typography, and semantic roles live as CSS custom properties under `:root` (light) and `.dark` (dark) in `packages/ui/src/styles/globals.css`. Token names follow shadcn conventions (`--background`, `--foreground`, `--primary`, `--destructive`, `--sidebar-*`, `--chart-*`).
2. **Theme mapping via `@theme inline`**: The globals map CSS variables into Tailwind's theme namespace (`--color-primary`, `--radius-md`, `--font-sans`, etc.) so Tailwind utilities like `bg-primary`, `text-foreground`, `rounded-lg` resolve automatically without a `tailwind.config.js`.
3. **Component composition pattern**: Each shadcn-style component in `packages/ui/src/components/*.tsx` follows the same shape — import a Base UI primitive, define `cva` variants, merge classes with `cn(...)`, and forward props. This ensures consistent variant APIs across the library.
4. **Dark mode strategy**: Dark mode is activated by adding the `.dark` class to the document root (via `next-themes`); all tokens have explicit dark-mode overrides in the `.dark` block.
5. **Responsive strategy**: Breakpoints are handled via Tailwind's responsive utilities (e.g., `sm:`, `md:` classes in component classNames). A shared `useIsMobile` hook exposes a boolean based on a `768px` breakpoint for programmatic logic.
6. **App-shell separation**: The Next.js app (`apps/web`) contains no custom CSS beyond importing `@atlas/ui/globals.css`. All visual styling flows through the shared `@atlas/ui` package, making it reusable across other workspace packages if needed.
7. **Animation & motion**: `tw-animate-css` is imported globally, providing prebuilt animation utilities accessible via Tailwind classes.
8. **Icons**: The shadcn config declares `hugeicons` as the icon library, while `lucide-react` is also available as a dependency in both `@atlas/ui` and `web`.

## Conventions and constraints

- **All styles go through Tailwind utility classes** — no arbitrary CSS rules inside components; global resets and base styles are confined to `packages/ui/src/styles/globals.css`.
- **Design tokens must be used instead of hardcoded colors** — new colors should be added as CSS variables in `:root` / `.dark` blocks and mapped via `@theme inline`, not as inline hex values in components.
- **Components use `cva` for variants** — every shadcn-style component defines its variant set declaratively via `class-variance-authority` rather than conditional class strings.
- **Class merging always goes through `cn()`** — the shared utility in `packages/ui/src/lib/utils.ts` is the single point for combining classes with `clsx` + `tailwind-merge` to avoid conflicts.
- **Dark mode is opt-in via the `.dark` class** — components assume light mode by default and rely on CSS variable overrides for dark mode; no component-specific dark-mode logic is required.
- **Breakpoint constants are centralized** — the `MOBILE_BREAKPOINT = 768` value in `use-mobile.ts` is the canonical mobile breakpoint used by hooks; Tailwind responsive prefixes handle layout-level responsiveness.
- **shadcn CLI configuration is locked to the shared globals** — `apps/web/components.json` pins the Tailwind CSS path to `../../packages/ui/src/styles/globals.css`, ensuring any generated components inherit the same theme and tokens.
