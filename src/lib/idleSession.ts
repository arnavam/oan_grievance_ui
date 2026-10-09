import { IDLE_TIMEOUT_MS } from '@/lib/idleTimeoutConfig';
import type { NextResponse } from 'next/server';

// The idle-session clock, layered on top of the JWT/refresh-token session in
// `session.ts`. A valid token pair only proves a session was *opened*; this
// cookie proves it's still *active*. It carries no timestamp to compare —
// its own expiry is the clock, reset on every login, refresh, and
// `/api/auth/heartbeat` call — so checking it is a presence test, not date
// arithmetic.

export const LAST_ACTIVITY_COOKIE = 'last_activity';

// Intentionally mirrors `session.ts`'s `sessionCookieOptions` rather than
// importing it — this module and `session.ts` both need each other's helpers
// (session.ts calls `touchActivityCookie`/`clearActivityCookie` on every
// cookie write), and a real import cycle isn't worth it for four fields.
const activityCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

export function touchActivityCookie(response: NextResponse): void {
  response.cookies.set(LAST_ACTIVITY_COOKIE, '1', {
    ...activityCookieOptions,
    maxAge: Math.floor(IDLE_TIMEOUT_MS / 1000),
  });
}

export function clearActivityCookie(response: NextResponse): void {
  response.cookies.set(LAST_ACTIVITY_COOKIE, '', { ...activityCookieOptions, maxAge: 0 });
}

export interface CookieReader {
  cookies: { get(name: string): { value: string } | undefined };
}

/** Whether the idle clock is still running, i.e. some activity happened within the last `IDLE_TIMEOUT_MS`. */
export function hasRecentActivity(request: CookieReader): boolean {
  return !!request.cookies.get(LAST_ACTIVITY_COOKIE)?.value;
}

/**
 * Whether a request that otherwise has a session (an auth or refresh token
 * cookie — the caller has already checked this, since deciding "is there a
 * session" is `session.ts`'s concern and importing its cookie names back into
 * this module would create a cycle) has gone idle.
 *
 * Every entry point that accepts a session cookie needs this, not just page
 * navigations: `src/proxy.ts` excludes `/api/*` from its matcher (redirecting
 * an XHR/fetch call makes no sense — those need a 401, not a 307), which
 * means `/api/proxy/[...path]`, `/api/auth/me`, and `/api/auth/refresh` must
 * each check idle expiry themselves. Skipping it there would leave the idle
 * timeout enforced only on full page loads — every real data call in this
 * SPA goes through `/api/proxy/*` without one.
 */
export function isIdleExpired(hasSessionCookie: boolean, request: CookieReader): boolean {
  return hasSessionCookie && !hasRecentActivity(request);
}
