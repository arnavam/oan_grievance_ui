# AGENT.md — Grievance Management Portal (`oan_grievance_ui`)

> **Scope.** This file is the authoritative engineering reference for this repository — for human contributors and for AI coding agents (Claude, Copilot, Cursor, etc.) alike. If you are an agent: read this before writing code, and re-check the relevant section before opening a PR.
>
> **Precedence.** If code in this repo contradicts a rule below, the rule wins — fix the code, or open a PR to amend this file (§17). Never silently diverge from either.
>
> Some agent tooling looks for `AGENTS.md` (plural) instead. If your tool requires that exact name, keep a copy or a symlink in sync with this file.

## Table of Contents

1. Project Snapshot and Tech Stack
2. Environment Setup
3. Commands
4. Architecture and Module Boundaries
5. Next.js 16 Conventions
6. State Management
7. Validation and Data Access
8. Styling
9. Component and Reusability Standards
10. Internationalization
11. Testing
12. Security
13. Performance
14. Accessibility
15. Git and PR Workflow
16. Agent Checklist (Definition of Done)
17. Amending This Document

---

## 1. Project Snapshot and Tech Stack

The Grievance Management Portal is the enterprise web client through which complainants submit grievances and officers/administrators triage, route, and resolve them, at a scale of millions of users. Every rule below exists to keep the codebase legible at that scale over many years and many contributors — not to satisfy a style preference.

| Layer | Technology | Notes |
|---|---|---|
| Framework | **Next.js 16** | App Router only. Turbopack is the default and only supported bundler (stable for dev + build in 16). |
| UI library | **React 19.2.4** | Server Components by default; Client Components are the exception. |
| Language | **TypeScript 5** | `strict` mode, no `any`. See §4 and §9. |
| Runtime | **Node.js ≥ 24.0.0** | Pinned via `.nvmrc`, an LTS line. |
| Package manager | **pnpm 11.17.0** | Pinned via `packageManager` + Corepack. No `npm`/`yarn` lockfiles in this repo. |
| Styling | **Tailwind CSS v4** | CSS-first configuration (`@theme`). No `tailwind.config.js`. |
| Icons | **lucide-react** | Named imports only. |
| Client state | **Redux Toolkit + React-Redux** (`store/`) | Client-only, cross-cutting state. Not a server-data cache. |
| Validation | **Zod** | Single source of truth for runtime validation and static types. |
| i18n | **next-intl** (`i18n/`, `messages/`) | All user-facing copy goes through it — no exceptions. |
| Charts | **Recharts** | Always client-rendered; wrapped in `shared/ui/charts`. |
| Unit / component tests | **Vitest, Testing Library, jsdom** | Colocated with source. |
| E2E tests | **Playwright** | Critical user journeys only. |
| Lint / architecture | **ESLint 9 (flat config)** — `eslint-config-next`, `eslint-plugin-boundaries` | Boundaries enforce the layered architecture in §4. |

### 1.1 Domain glossary

Illustrative starting point — correct and extend these to match the real domain model on first use. Keep this current; it's where new contributors (and agents) learn the domain's vocabulary before reading code.

| Term | Meaning |
|---|---|
| Grievance | A complaint submitted through the portal, tracked from `submitted` to `resolved`. |
| Complainant | The person who filed the grievance. |
| Officer | Portal user who triages, investigates, or resolves grievances. |
| Escalation | Reassignment of a grievance to a higher authority after an SLA or severity trigger. |

---

## 2. Environment Setup

```bash
# 1. Use the pinned Node version
nfm use               # reads .nvmrc

# 3. Install dependencies — uses pnpm-lock.yaml; never delete it to "fix" an install
pnpm install
```

```json
// package.json (excerpt)
{
  "engines": { "node": ">=24.0.0" },
  "packageManager": "pnpm@11.17.0"
}
```

- **`.env.local`** — local secrets and machine-specific overrides. Never committed.
- **`.env.example`** — every variable the app reads, with placeholder values, updated in the same PR that introduces a new one.
- A variable exposed to the browser is prefixed `NEXT_PUBLIC_` **and** contains no secret. If it's a secret, it stays server-only and unprefixed — see §12.
- Recommended editor setup: ESLint + Tailwind CSS IntelliSense extensions. Do not assume a formatter is present — none is configured in this stack today.

---

## 3. Commands

| Purpose | Command |
|---|---|
| Start dev server (Turbopack, HMR) | `pnpm dev` |
| Production build (Turbopack) | `pnpm build` |
| Start production server | `pnpm start` |
| Lint | `pnpm lint` → `eslint .` |
| Lint and auto-fix | `pnpm lint:fix` → `eslint . --fix` |
| Type-check (no emit) | `pnpm typecheck` → `tsc --noEmit` |
| Unit / component tests | `pnpm test` → `vitest run` |
| Unit tests, watch mode | `pnpm test:watch` → `vitest` |
| Coverage report | `pnpm test:coverage` → `vitest run --coverage` |
| E2E tests | `pnpm test:e2e` → `playwright test` |
| E2E tests, interactive UI | `pnpm test:e2e:ui` → `playwright test --ui` |

> **`next lint` does not exist in Next.js 16** — it was removed from the CLI, along with the `eslint` key in `next.config.ts`. ESLint is invoked directly via its own CLI.
>
> Turbopack is the default bundler for both `dev` and `build` — no flag needed. Pass `--webpack` only to work around a documented Turbopack incompatibility, and record the reason next to the script when you do.

A PR does not merge unless `typecheck`, `lint`, and `test` all pass in CI. `test:e2e` runs on `main` and release branches at minimum.

---

## 4. Architecture and Module Boundaries

This project uses a **layered, feature-oriented architecture**, enforced automatically by `eslint-plugin-boundaries` — a build-breaking lint rule, not a suggestion. The goal: any engineer can predict where a piece of code lives and what it may depend on, without asking.

### 4.1 Folder structure

```
oan_grievance_ui/
├─ .nvmrc
├─ next.config.ts
├─ eslint.config.mjs
├─ vitest.config.ts
├─ playwright.config.ts
├─ messages/                 # next-intl message catalogs (en.json, ar.json, ...)
├─ e2e/                      # Playwright specs (*.spec.ts) — not colocated
├─ public/
├─ realtime-gateway/         # WebSocket auth BFF (cookie to Bearer translation)
└─ src/
   ├─ app/                   # Next.js App Router: routing shell ONLY
   │  ├─ [locale]/
   │  │  ├─ (public)/        # complainant-facing routes
   │  │  ├─ (portal)/        # officer/admin-facing routes
   │  │  ├─ layout.tsx
   │  │  └─ page.tsx
   │  └─ api/                # Route Handlers, when a Server Action isn't a fit
   ├─ proxy.ts               # was middleware.ts pre-Next.js 16 — see §5.3
   ├─ i18n/                  # next-intl config: routing.ts, request.ts, navigation.ts
   ├─ views/                 # page-level composition — roughly one view per route
   │  └─ grievance-dashboard/
   ├─ features/              # one user-facing action per folder
   │  └─ submit-grievance/
   │     ├─ ui/
   │     ├─ model/           # slice.ts, selectors.ts, hooks
   │     ├─ lib/             # schema.ts (Zod), server actions
   │     └─ index.ts         # public API — the ONLY thing other layers import
   ├─ entities/              # domain nouns
   │  └─ grievance/
   │     ├─ ui/              # GrievanceStatusBadge, GrievanceCard
   │     ├─ model/           # schema.ts, types.ts
   │     ├─ api/             # typed fetchers / RTK Query endpoints
   │     └─ index.ts
   ├─ shared/                # zero domain knowledge, framework-thin
   │  ├─ ui/                 # design-system kit: Button, Input, Modal, DataTable, charts
   │  ├─ lib/                # generic utils, generic hooks
   │  ├─ config/
   │  └─ types/
   └─ store/                 # Redux Toolkit composition root — see §6
      ├─ index.ts
      ├─ hooks.ts
      └─ StoreProvider.tsx
```

> If this repository does not use a `src/` directory, apply the same tree one level up. `messages/`, `public/`, and `e2e/` stay outside `src/` either way.

### 4.2 Layer responsibilities and the dependency rule

Dependencies point **one direction only**, down this list. A layer may import from anything below it, never above it, and never sideways into another module's internals:

`app → views → features → entities → shared`

| Layer | Owns | May import from |
|---|---|---|
| `app` | Route segments, layouts, metadata, `proxy.ts`. No business logic. | `views`, `features`, `entities`, `shared`, `store` |
| `views` | Page-level composition of features + entities into a full screen. | `features`, `entities`, `shared`, `store` |
| `features` | One user-facing action: its UI, its Redux slice (if any), its Zod schema, its Server Action. | `entities`, `shared`, `store` |
| `entities` | Domain nouns: canonical types, minimal display components, typed API access for that noun. | `shared` |
| `shared` | Generic, reusable, domain-ignorant primitives. | nothing project-specific |
| `store` | Redux Toolkit composition root: combines slices, exposes typed hooks. | `features`, `entities` — composition only, see §6.1 |

**Cross-cutting rule:** a `feature` never imports another `feature` directly, and a `view` never reaches into another `view`. If two features need to share logic, promote it to `entities` or `shared` — that is the entire point of the boundary.

**Public API rule:** import a feature or entity by its `index.ts` only (`import { SubmitGrievanceForm } from '@/features/submit-grievance'`), never by reaching into its `ui/`, `model/`, or `lib/` subfolders from outside. This is enforced by review today; teams wanting automated enforcement can add `eslint-plugin-boundaries`'s entry-point rule on top of `element-types` below.

### 4.3 `eslint-plugin-boundaries` configuration

```js
// eslint.config.mjs (excerpt — alongside eslint-config-next and the TypeScript config)
import boundaries from 'eslint-plugin-boundaries'

export default [
  // ...eslint-config-next/core-web-vitals, eslint-config-next/typescript, etc.
  {
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app/**' },
        { type: 'views', pattern: 'src/views/*' },
        { type: 'features', pattern: 'src/features/*' },
        { type: 'entities', pattern: 'src/entities/*' },
        { type: 'shared', pattern: 'src/shared/*' },
        { type: 'store', pattern: 'src/store/**' },
      ],
    },
    rules: {
      'boundaries/element-types': ['error', {
        default: 'disallow',
        message: '${file.type} may not import ${dependency.type} — see AGENT.md §4.',
        rules: [
          { from: 'app', allow: ['views', 'features', 'entities', 'shared', 'store'] },
          { from: 'views', allow: ['features', 'entities', 'shared', 'store'] },
          { from: 'features', allow: ['entities', 'shared', 'store'] },
          { from: 'entities', allow: ['shared'] },
          { from: 'shared', allow: [] },
          { from: 'store', allow: ['features', 'entities'] }, // composition-root exception, §6.1
        ],
      }],
    },
  },
]
```

```
❌  src/features/assign-officer/ui/AssignForm.tsx
    import { validateGrievance } from '@/features/submit-grievance/lib/schema'
    // disallowed: feature → feature, and a deep import besides

✅  src/features/assign-officer/ui/AssignForm.tsx
    import { grievanceSchema } from '@/entities/grievance'
    // allowed: feature → entities, via its public index.ts
```

---

## 5. Next.js 16 Conventions

### 5.1 Server vs. Client Components

Default to Server Components. Add `'use client'` only at the leaf that genuinely needs interactivity, browser APIs, or a hook that requires the client (state, effects, Redux, event handlers). Push the boundary as deep into the tree as possible — a page is not a Client Component just because one button in it needs `onClick`.

Redux Toolkit requires a client context, so anything reading `useAppSelector`/`useAppDispatch` is necessarily a Client Component — keep that subtree small (§6).

### 5.2 Async request APIs

`params`, `searchParams`, `cookies()`, and `headers()` are asynchronous — always `await` them; there is no synchronous fallback.

```tsx
// ✅ Correct
export default async function GrievancePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const cookieStore = await cookies()
  // ...
}
```

### 5.3 `proxy.ts` (formerly `middleware.ts`)

Next.js 16 renamed `middleware.ts` to `proxy.ts`; the exported function is named `proxy`, or default-exported. It runs on the **Node.js runtime by default** now, not Edge — full Node APIs are available there. Only one `proxy.ts` is supported per project, so locale negotiation and auth gating are composed in one file:

```ts
// src/proxy.ts
import createIntlMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import { routing } from '@/i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

export default function proxy(request: NextRequest) {
  const isPortalRoute = /\/(officer|admin)(\/|$)/.test(request.nextUrl.pathname)
  if (isPortalRoute && !request.cookies.get('session')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return intlMiddleware(request)
}

export const config = {
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
}
```

`proxy.ts` gates for UX only. It is never the sole access control — every Server Action and Route Handler re-checks authorization itself (§12).

### 5.4 Caching — Cache Components and `use cache`

Next.js 16's caching model is explicit and opt-in: nothing is cached unless the `'use cache'` directive says so. Enable it project-wide:

```ts
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  cacheComponents: true,
}

export default nextConfig
```

Wrap any dynamic, per-request read in `<Suspense>` so the static shell around it can still prerender:

```tsx
import { Suspense } from 'react'
import { unstable_cacheLife as cacheLife, unstable_cacheTag as cacheTag } from 'next/cache'
import { cookies } from 'next/headers'

export default function DashboardPage() {
  return (
    <>
      <Suspense fallback={<StatsSkeleton />}>
        <GrievanceStats />
      </Suspense>
      <Suspense fallback={<NotificationsSkeleton />}>
        <OfficerNotifications />
      </Suspense>
    </>
  )
}

async function GrievanceStats() {
  'use cache'
  cacheLife('hours')
  cacheTag('grievance-stats')
  const stats = await grievanceApi.getStats()
  return <StatsPanel stats={stats} />
}

async function OfficerNotifications() {
  // Reads cookies() → stays dynamic; no 'use cache' here
  const officerId = (await cookies()).get('officerId')?.value
  const items = await notificationApi.getUnread(officerId)
  return <NotificationList items={items} />
}
```

Invalidate from the Server Action that performed the mutation. `revalidateTag` is asynchronous in Next.js 16 — await it:

```ts
'use server'
import { revalidateTag } from 'next/cache'

export async function resolveGrievanceAction(id: string) {
  await grievanceApi.resolve(id)
  await revalidateTag(`grievance:${id}`)
  await revalidateTag('grievance-stats')
}
```

Rule of thumb: static/semi-static content (published FAQs, department directories, aggregate stats) is a `'use cache'` candidate. Anything personalized to the signed-in officer, or needing sub-second freshness (a live queue), stays dynamic.

> This section covers what this codebase actually uses. Next.js 16 has other breaking changes (parallel-route `default.js` semantics, AMP removal, tightened image security) that don't come up in day-to-day feature work here — consult the official Next.js upgrade documentation if you touch those areas.

### 5.5 File-convention exports

Named exports everywhere, **except** where the App Router file convention requires a default export:

| File | Export |
|---|---|
| `page.tsx`, `layout.tsx`, `template.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `global-error.tsx` | `default` (framework requirement) |
| `route.ts` | Named, per HTTP verb: `export async function GET() {}` |
| `proxy.ts` | `default`, or named `export const proxy = ...` |
| Everything else (components, hooks, utils, schemas, slices) | Named, always |

Never add a default export to a regular component/util file "for convenience" — it breaks consistent auto-import naming across the codebase, which is exactly the ambiguity this rule removes.

---

## 6. State Management

Redux Toolkit is not a server-data cache. Using it as one — mirroring `fetch` results into a slice "just in case" — produces two sources of truth and stale-data bugs. Use this table before reaching for `useState` or `dispatch`:

| Kind of state | Lives in |
|---|---|
| Data owned by the server (grievance records, officer list, department config) | Server Component fetch + Cache Components (§5.4), or an `entities/*/api` fetcher |
| Cross-cutting client UI state (modal/drawer open state, toast queue, sidebar collapsed) | Redux Toolkit, `store/` |
| In-progress multi-step form / wizard data | Redux Toolkit slice scoped to that feature (`features/*/model/*.slice.ts`) |
| Local, single-component UI state (hover, focus, a local toggle) | `useState`/`useReducer` in the component — not Redux |
| A value derived from other state | A selector (`createSelector`) or `useMemo` — never persisted redundantly |
| A mutation in flight | `useActionState`/`useFormStatus` (React 19) around a Server Action, unless the mutation is client-orchestrated (an optimistic queue) — the one case a hand-rolled Redux loading flag is justified |

### 6.1 Store composition — the one boundary exception

`store/` is the composition root: the single place allowed to import every feature's slice to assemble the root reducer. Nothing else gets that privilege. Splitting the store into three files keeps that exception from becoming a real circular import:

```ts
// src/store/index.ts — composition (imports FROM features/entities — the exception)
import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { submitGrievanceReducer } from '@/features/submit-grievance'
import { grievanceReducer } from '@/entities/grievance'

const rootReducer = combineReducers({
  submitGrievance: submitGrievanceReducer,
  grievance: grievanceReducer,
})

export const makeStore = () => configureStore({ reducer: rootReducer })

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
```

```ts
// src/store/hooks.ts — depends only on TYPES from ./index, never on feature files directly
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux'
import type { RootState, AppDispatch } from './index'

export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
```

```tsx
// src/store/StoreProvider.tsx — one store instance PER REQUEST, never a module singleton
'use client'
import { useRef } from 'react'
import { Provider } from 'react-redux'
import { makeStore, type AppStore } from './index'

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<AppStore | undefined>(undefined)
  if (!storeRef.current) {
    storeRef.current = makeStore()
  }
  return <Provider store={storeRef.current}>{children}</Provider>
}
```

A module-level `export const store = configureStore(...)` singleton leaks state between requests on the server — never do this in the App Router. Always construct the store inside a component with `useRef`, as above.

---

## 7. Validation and Data Access

**Parse, don't validate.** Every value crossing a trust boundary — Server Action arguments, Route Handler bodies, search params, form data — is parsed through a Zod schema before it touches business logic. An unvalidated payload from `request.json()` never reaches a database call.

- Canonical domain schemas live in `entities/<name>/model/schema.ts`; the TypeScript type is derived, never hand-duplicated:
  ```ts
  // src/entities/grievance/model/schema.ts
  import { z } from 'zod'

  export const grievanceSchema = z.object({
    id: z.string(),
    subject: z.string().min(5).max(200),
    description: z.string().min(20),
    status: z.enum(['submitted', 'in_review', 'escalated', 'resolved']),
  })

  export type Grievance = z.infer<typeof grievanceSchema>
  ```
- Feature-specific input schemas compose the entity schema instead of redeclaring fields:
  ```ts
  // src/features/submit-grievance/lib/schema.ts
  import { grievanceSchema } from '@/entities/grievance'

  export const submitGrievanceInputSchema = grievanceSchema.pick({
    subject: true,
    description: true,
  })
  ```
- Every entity owns one typed data-access module (`entities/<name>/api/`). Components and Server Actions call these functions; a bare `fetch()` never appears inside a component.
- Default mutation path: **Server Actions**, validated by the feature's own schema, colocated in `features/*/lib/actions.ts`. RTK Query is an accepted alternative only for subtrees with a genuine client-cache/polling need (e.g., a live officer queue) — name the reason in the feature's own README. Two competing data paradigms without a stated reason is exactly the ambiguity this document exists to prevent.

---

## 8. Styling

Tailwind v4 is configured entirely in CSS — there is no `tailwind.config.js`/`.ts` in this project.

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  --color-brand-500: oklch(0.6 0.2 250);
  --color-surface: oklch(0.98 0 0);
  --font-sans: "Inter", sans-serif;
  --radius-md: 0.5rem;
}
```

- All design tokens (color, spacing, radius, type scale) are declared once in `@theme` and consumed as Tailwind utilities (`bg-brand-500`) — never as raw hex/px values sprinkled through components.
- Content detection is automatic in v4 — do not add a manual `content: [...]` array back.
- `@apply` is allowed only inside `shared/ui` primitives for genuinely repeated utility clusters; feature code composes utility classes directly in JSX.
- **lucide-react**: import only the icons used (`import { AlertCircle } from 'lucide-react'`) — never `import * as Icons`.

---

## 9. Component and Reusability Standards

A component belongs in `shared/ui` only if it has **zero knowledge of the grievance domain** — it takes typed props and renders; it never fetches, and never imports from `entities` or `features`.

- **Colocation:** `ComponentName/ComponentName.tsx`, `ComponentName/ComponentName.test.tsx`, `ComponentName/index.ts` — the index re-exports the component and its prop type, nothing else.
- **Props over booleans.** Prefer a discriminated union to a pile of optional flags:
  ```ts
  // ❌ Ambiguous — what happens if both are true?
  type ButtonProps = { primary?: boolean; large?: boolean }

  // ✅ Unambiguous — exactly one state per axis
  type ButtonProps = { variant: 'primary' | 'secondary'; size: 'sm' | 'md' | 'lg' }
  ```
- **Compound components** for anything with more than ~3 configurable regions (`DataTable.Root`, `DataTable.Header`, `DataTable.Row`) instead of one component with a dozen render props.
- **Exports:** named only — see §5.5 for the framework-file exception.
- Recharts components are always Client Components, wrapped by `shared/ui/charts`; load heavy chart components with `next/dynamic(() => import(...), { ssr: false })` so `ResponsiveContainer`'s initial zero-size measurement never causes a hydration mismatch.

---

## 10. Internationalization

Every user-facing string goes through `next-intl` — no hardcoded strings in JSX, including placeholder text, `aria-label`s, and error messages.

- Message keys are nested to mirror the module tree, so a key's location is never a guess:
  ```json
  // messages/en.json
  {
    "features": {
      "submitGrievance": {
        "title": "Submit a grievance",
        "subjectLabel": "Subject"
      }
    }
  }
  ```
  ```tsx
  const t = useTranslations('features.submitGrievance')
  <h1>{t('title')}</h1>
  ```
- Counts and pluralization use ICU message syntax (`"{count, plural, one {# day left} other {# days left}}"`) — never manual string concatenation with a count.
- Dates and numbers are formatted via `next-intl`'s `useFormatter`, never a scattered `toLocaleDateString()` — this keeps every locale correct from one place.
- Adding a string: update `messages/en.json` **and every other locale file in the same PR**. A missing key in a non-default locale is a bug, not a follow-up task.

---

## 11. Testing

| Layer | Tool | Covers |
|---|---|---|
| Unit / component | Vitest + Testing Library + jsdom | Behavior and rendered output; colocated `*.test.tsx` next to source |
| E2E | Playwright, `e2e/*.spec.ts` | Critical journeys only: submit, escalate, resolve, search/filter |

- Query by role/label (`getByRole`, `getByLabelText`), not by test-id or class name — this doubles as an accessibility smoke test.
- Mock at the network/entity-API boundary, not React internals. No snapshot tests of large component trees — they fail on unrelated changes and teach reviewers to ignore the diff.
- Minimum coverage enforced in CI: **80% lines/branches for `shared` and `entities`** (everything depends on them, so regressions there are the most expensive); `features`, `views`, and `app` are held to a lower, team-agreed bar since much of their value is integration behavior that E2E covers instead.
- Every feature ships with, at minimum: one component test for its primary UI and one unit test for its Zod schema/business logic. Features on the critical-journey list additionally get a Playwright spec.

---

## 12. Security

- **Validate at every boundary** — §7. No exception for "internal" endpoints.
- **Defense in depth on auth:** `proxy.ts` (§5.3) gates for UX/redirect purposes; every Server Action and Route Handler re-checks the caller's session and role itself, as close to the data as possible. A hidden button is not access control.
- **Secrets** never carry the `NEXT_PUBLIC_` prefix and are never committed; `.env.example` documents every variable name with a placeholder, never a real value.
- **Rich text / HTML:** avoid `dangerouslySetInnerHTML`. If a grievance description ever needs rich text, sanitize server-side with a vetted library on write, and again defensively on render — never rely on write-time sanitization alone.
- **CSP** is set via response headers in `next.config.ts`.
- **Dependencies:** `pnpm-lock.yaml` is committed and is the only source of truth for versions; `pnpm audit` runs in CI; `--force`/`--legacy-peer-deps` requires a comment explaining why.
- **RBAC:** role checks live in the data-access layer (`entities/*/api`), not only in the UI — a user who guesses a URL or calls a Server Action directly must still be stopped server-side.

---

## 13. Performance

- Images via `next/image`, fonts via `next/font` — never a raw `<img>` or a manually linked webfont.
- Turbopack is the only supported bundler; don't add webpack-specific config without a documented, reviewed reason (§3).
- The React Compiler ships stable with React 19.2 / Next.js 16 but is **off by default**. This project enables it to remove most manual `useMemo`/`useCallback` bookkeeping:
  ```bash
  pnpm add -D babel-plugin-react-compiler
  ```
  ```ts
  // next.config.ts
  const nextConfig = {
    reactCompiler: true,
  }
  ```
  Reach for `useMemo`/`useCallback` by hand only where profiling shows the compiler isn't enough.
- Code-split heavy, rarely-above-the-fold client widgets (charts, rich editors) with `next/dynamic`.
- Don't memoize speculatively — a `useMemo` around a cheap computation adds a dependency array to keep correct for no measured benefit.

---

## 14. Accessibility

This portal is a public/enterprise service used at scale — WCAG 2.2 AA is the floor, not an aspiration.

- Semantic HTML first; ARIA fills gaps semantic HTML can't cover, it doesn't replace it.
- Every interactive element is keyboard-operable with a visible focus state — never `outline: none` without a replacement that meets contrast requirements.
- Every form control has a real `<label>`; errors are tied to their field via `aria-describedby`.
- Solve accessibility once, in `shared/ui` — a feature composing `shared/ui/Input` inherits its accessible behavior instead of re-solving it.
- Automated checks: an axe-based assertion in component tests for every `shared/ui` primitive, plus accessibility smoke coverage in the Playwright critical-journey specs.

---

## 15. Git and PR Workflow

- **Commits:** Conventional Commits — `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `perf:`, `chore:`, optionally scoped: `feat(submit-grievance): add attachment upload`.
- **Branches:** `feature/<ticket-id>-short-description`, `fix/<ticket-id>-short-description`.
- **PR checklist:** tests added/updated; `messages/*.json` updated for every locale if any string changed; accessibility checked; `typecheck` + `lint` + `test` green.
- `main` is protected; merges are squashed for a linear, bisectable history.

---

## 16. Agent Checklist (Definition of Done)

Before considering a change complete, confirm every line:

- [ ] `pnpm typecheck`, `pnpm lint`, and `pnpm test` all pass locally.
- [ ] New code sits in the correct layer per §4.2; no import violates the direction rule.
- [ ] No new top-level folder was added without updating §4.1 in this file.
- [ ] All external input is Zod-validated at its entry point (§7).
- [ ] Every new user-facing string exists in **every** file under `messages/`, not just `en.json`.
- [ ] No hardcoded string, no raw hex color, no `any`, no default export outside the framework exception (§5.5).
- [ ] New `shared/ui` components are keyboard-operable and labeled.
- [ ] A test was added or updated for the behavior that changed.

---

## 17. Amending This Document

This file changes through the same PR process as code. If a rule no longer matches reality, fix the rule — don't let the codebase and the documentation quietly drift apart; that gap is exactly what makes a codebase hard to onboard into.

---

*Document version 1.0 — drafted 2026-09-24.*

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
