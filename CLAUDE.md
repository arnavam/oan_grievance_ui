@AGENTS.md

# Grievance Management Portal

A grievance-intake and case-management dashboard for Ethiopia OpenAgriNet. Next.js 16 (App Router, Turbopack), Redux Toolkit for client state, Tailwind v4. There is no local database or ORM — every real read/write goes through `oan_auth_service` (auth) and the wider OpenAgriNet backend (grievance data), reached only from server-side code.

## Auth & session architecture

Sessions are three httpOnly cookies (access token, refresh token, remember-me flag) plus an idle-activity cookie — never a token in `localStorage` or client state. Start at `src/lib/session.ts` (the single place cookies are written/cleared) rather than re-deriving this from each route:

- `src/proxy.ts` — the route guard (Next 16 renamed `middleware` to `proxy`; see `AGENTS.md`). Decodes (not verifies) the access token to route protected vs. public pages, and stamps every response with a per-request CSP nonce.
- `src/lib/session.ts` — session cookie read/write/clear.
- `src/lib/idleSession.ts` / `src/lib/idleTimeoutConfig.ts` — the idle-timeout clock (`/api/auth/heartbeat` and the client `useIdleTimer` hook slide it forward). Enforced at every entry point that accepts a session cookie, not just `src/proxy.ts` — `proxy.ts` excludes `/api/*` from its matcher (a redirect doesn't make sense for an XHR/fetch call), so `/api/proxy/[...path]`, `/api/auth/me`, and `/api/auth/refresh` each check `isIdleExpired` themselves too. `/api/proxy/*` is the one that matters most in practice: it's every real data call this SPA makes.
- `src/lib/jwt.ts` — decodes the access token's claims for display/routing only; the backend is what actually verifies it.
- `src/lib/rateLimit.ts` — in-memory, per-process rate limiting for the `/api/auth/*` routes.
- `src/app/api/proxy/[...path]/route.ts` — the one path all non-auth backend calls go through, so the browser only ever talks to same-origin `/api/*`.
- `src/lib/realtime/` + `realtime-gateway/server.ts` + `src/app/api/realtime/config/route.ts` — the socket.io client for `oan_grievance_service`'s AsyncAPI events (`attachment_scanned`, `notification`). A browser connects to the same-origin gateway on port 3001, which checks the idle cookie and translates the `auth_token` cookie into an `Authorization: Bearer` header before forwarding to Frappe. Events are signals: listeners refetch through `/api/proxy`, and a local `resync` event fires on reconnect and tab focus because missed events are never replayed.
- `src/features/auth/logout.ts` — `performLogout`, the single way a session ends client-side (revokes server-side, then resets Redux). Anything that signs the user out — the header's Sign Out button, the idle timer — goes through this rather than reimplementing it, and awaits it before navigating: a fire-and-forget logout races the next page's session-restore check.
- `src/app/api/auth/set-initial-password/route.ts` + `src/features/auth/components/SetInitialPasswordModal.tsx` — an admin-created officer's first sign-in. `POST /api/v1/auth/login` answers `403 PASSWORD_CHANGE_REQUIRED` (not the generic invalid-credentials message — see `login/route.ts`'s own branch) when the password is correct but still the one an admin typed for them (`CreateOfficer.temporary_password` / `POST /api/v1/officers/:officer/password-resets` in `oan_grievance_service`). `LoginForm` detects that distinct message and opens this modal, which is guest-reachable (no token — the temporary password itself proves identity) and sets no session cookies: the officer signs in fresh afterwards.

## Required environment variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `AUTH_API_BASE_URL` | Yes | — | Base URL of `oan_auth_service` (see `src/lib/env.ts`) |
| `TRUSTED_PROXY_HOPS` | No | `0` (don't trust `X-Forwarded-For`) | Reverse-proxy hop count for client-IP resolution |
| `RATE_LIMIT_<LOGIN\|REGISTER\|REGISTER_SHARED\|REFRESH\|LOGOUT\|HEARTBEAT\|FORGOT_PASSWORD\|RESET_PASSWORD\|SET_INITIAL_PASSWORD\|REALTIME_CONFIG>_MAX` / `_WINDOW_MS` | No | see `rateLimit.ts` | Per-route rate-limit overrides. `REGISTER_SHARED` is the effective ceiling for `/api/auth/register` whenever `TRUSTED_PROXY_HOPS` is unset — see that route's own comments. `SET_INITIAL_PASSWORD` guards `/api/auth/set-initial-password`, where an officer replaces an admin-issued temporary password (`oan_auth_service`'s `POST /api/v1/auth/password/initial`) |
| `IDLE_TIMEOUT_MS` / `IDLE_WARNING_LEAD_MS` | No | 15 min / 60 s | Server-enforced idle-session cutoff and warning lead |
| `NEXT_PUBLIC_IDLE_TIMEOUT_MS` / `NEXT_PUBLIC_IDLE_WARNING_LEAD_MS` | No | same as above | Client copies — set alongside the two above if you override them, or the warning modal drifts from the actual cutoff |
| `REALTIME_PUBLIC_URL` / `REALTIME_GATEWAY_PORT` | No | unset (realtime off) | The URL the browser connects to for sockets (e.g. gateway at `http://localhost:3001`), and the port the gateway binds to. |
| `REALTIME_UPSTREAM_URL` / `REALTIME_SITE` | No | `ws://localhost:9000` | The backend socket.io origin the gateway proxies to, and the Frappe site name used for the namespace. |
| `REALTIME_UPSTREAM_IS_FRAPPE` / `REALTIME_PATH` | No | `false` / `/socket.io/` | Whether to inject Frappe-specific headers (`x-frappe-site-name`, overwrite Origin) and the socket path. |

## Commands

- `pnpm dev` / `pnpm build` / `pnpm start` / `pnpm lint`
- Node version is pinned in `.nvmrc` (Node 24); `package.json`'s `engines.node` is set to `>=24.0.0`.
