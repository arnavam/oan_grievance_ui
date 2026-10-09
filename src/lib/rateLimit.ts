import { envInt } from '@/lib/envInt';
import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';

// Fixed-window rate limiter for the authentication routes. State lives in
// this process's memory — right for a single Next container, and bounded by
// the sweep below so a flood of distinct IPs can't grow the map without limit.

interface Window {
  count: number;
  /** Epoch ms at which this window ends and the count resets. */
  resetAt: number;
}

const windows = new Map<string, Window>();

const SWEEP_INTERVAL_MS = 60_000;
let lastSweptAt = 0;

function sweep(now: number): void {
  if (now - lastSweptAt < SWEEP_INTERVAL_MS) return;
  lastSweptAt = now;
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the window resets. Only meaningful when `allowed` is false. */
  retryAfterSeconds: number;
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const window = windows.get(key);

  if (!window || window.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  window.count += 1;

  if (window.count > limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((window.resetAt - now) / 1000)),
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * A stable-enough, non-reversible fragment of a genuine secret (a refresh
 * token) to fold into a rate-limit key without storing the secret itself —
 * even truncated — in this process's in-memory map or its logs. Truncated:
 * this only needs to distinguish concurrent callers from each other, not
 * resist a targeted collision search against a rate-limit bucket. Not used
 * for identifiers that aren't secrets (an attempted email, a username) —
 * those are folded into the key directly, same as `login/route.ts` already
 * does.
 *
 * Exists because `getClientIp` (clientIp.ts) returns the constant
 * `'unknown'` for every caller when `TRUSTED_PROXY_HOPS` is unset (the
 * documented default) — a route keyed by IP alone would then collapse every
 * user on the site into one shared bucket. `login/route.ts` already avoids
 * this by also keying on the attempted username; this same pattern needs to
 * extend to every other rate-limited route that has *some* per-caller
 * identifier available, even though none of them can trust the IP.
 */
export function hashForRateLimit(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

/**
 * The `${route}:${clientIp}:${scope}` key shape every rate-limited route
 * builds, in one place instead of five independently-typed-out copies of the
 * same template (with the same risk that a sixth route gets the format
 * slightly wrong and silently doesn't get the "unknown"-collapse protection
 * the others do). `secret`, when present, is hashed via `hashForRateLimit`
 * (a refresh token); `identity`, when present, is folded in as-is, lowercased
 * (an email or username — not a secret, so no need to hash it). Passing
 * neither falls back to `'none'`, same as every route already did by hand for
 * "no per-caller identifier available for this request."
 */
export function buildRateLimitKey(
  route: string,
  clientIp: string,
  scope: { secret?: string | null; identity?: string | null } = {}
): string {
  const { secret, identity } = scope;
  const scopeValue = secret ? hashForRateLimit(secret) : identity ? identity.toLowerCase() : 'none';
  return `${route}:${clientIp}:${scopeValue}`;
}

/** The 429 every rate-limited route returns, worded identically regardless of which limit was hit. */
export function rateLimitedResponse(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { message: 'Too many attempts. Please wait a moment and try again.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
  );
}

// Every limit is env-overridable so a deployment can retune throughput
// (behind a CDN with a shared IP, say, or under a load test) without a
// redeploy. Falling back to today's literals keeps default behavior
// unchanged when nothing is set.
function limitFromEnv(name: string, defaultLimit: number, defaultWindowMs: number) {
  return {
    limit: envInt(`RATE_LIMIT_${name}_MAX`, defaultLimit),
    windowMs: envInt(`RATE_LIMIT_${name}_WINDOW_MS`, defaultWindowMs),
  };
}

export const RATE_LIMITS = {
  login: limitFromEnv('LOGIN', 5, 60_000),
  register: limitFromEnv('REGISTER', 5, 60_000),
  // The pure-IP registration check (see register/route.ts) has no per-caller
  // identity to fold in — that's the whole point, it's what actually bounds
  // a flood of *distinct* emails. But on a deployment with no trusted proxy
  // configured (`hasTrustedProxyConfigured()` in clientIp.ts is false — the
  // documented default), `clientIp` is the constant `'unknown'` for every
  // visitor, so that check's key is identical for the whole site: `register`'s
  // tight 5/min default would then mean any 5 registration attempts from
  // anywhere — including normal concurrent signups, not just an attacker —
  // lock out every other visitor's registration for the rest of the minute.
  // This higher ceiling is what that shared bucket actually needs to be sized
  // for. See register/route.ts for exactly when it's picked over `register`.
  registerShared: limitFromEnv('REGISTER_SHARED', 50, 60_000),
  refresh: limitFromEnv('REFRESH', 20, 60_000),
  logout: limitFromEnv('LOGOUT', 10, 60_000),
  // Both are unauthenticated and both cost the backend real work (a reset mail
  // or a password write), so they get login's tight budget. The backend adds
  // its own hourly per-IP ceiling on top; this one just stops a burst a hop
  // earlier.
  forgotPassword: limitFromEnv('FORGOT_PASSWORD', 5, 60_000),
  resetPassword: limitFromEnv('RESET_PASSWORD', 5, 60_000),
  // Mirrors oan_auth_service's own ceiling on `/api/v1/auth/password/initial` (10 per
  // address per 5 minutes) — this one just stops a burst a hop earlier, same reasoning
  // as forgotPassword/resetPassword above.
  setInitialPassword: limitFromEnv('SET_INITIAL_PASSWORD', 10, 300_000),
  // Fired on real user activity while a session is open (see
  // `/api/auth/heartbeat`); throttled client-side to roughly once a minute
  // per open tab. Scoped by a hash of the session's refresh-token cookie
  // (see `hashForRateLimit`) in addition to IP, same as every other route
  // here — the default is still generous since a heartbeat is a cheap
  // cookie touch and several tabs on one session share the same token.
  heartbeat: limitFromEnv('HEARTBEAT', 120, 60_000),
  // Unauthenticated (the language switcher works pre-login) but still a
  // same-origin state-changing POST like every other route here — a cheap
  // cookie write, but with no throttle at all a client could hammer it or
  // write an unbounded stream of requests, so it gets a limit too, just a
  // generous one.
  locale: limitFromEnv('LOCALE', 30, 60_000),
  // Hands the socket.io config to the client (see
  // `/api/realtime/config`). Called once per connect and once per reconnect,
  // so a tab only reaches this on a flapping connection.
  realtimeConfig: limitFromEnv('REALTIME_CONFIG', 30, 60_000),
} as const;
