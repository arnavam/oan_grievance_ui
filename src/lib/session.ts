import { clearActivityCookie, touchActivityCookie } from '@/lib/idleSession';
import { NextResponse } from 'next/server';

// Single source of truth for the session cookies. Every route that opens,
// renews or ends a session goes through the helpers below, so a cookie can
// never be set in one place and forgotten in another.

export const AUTH_TOKEN_COOKIE = 'auth_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';
/**
 * Records whether "Remember me" was ticked. The refresh route has no other
 * way to know: the refresh token is an opaque backend-issued string, so
 * without this a renewed cookie would silently get the long lifetime and a
 * short session would become a month-long one on the first refresh.
 */
export const SESSION_REMEMBER_COOKIE = 'session_remember';

/** Default session lifetime: 1 day. */
export const DEFAULT_SESSION_MAX_AGE = 24 * 60 * 60;
/** Session lifetime with "Remember me" ticked: 30 days. */
export const REMEMBERED_SESSION_MAX_AGE = 30 * 24 * 60 * 60;

export function sessionMaxAge(rememberMe: boolean): number {
  return rememberMe ? REMEMBERED_SESSION_MAX_AGE : DEFAULT_SESSION_MAX_AGE;
}

// `strict`, not `lax`: `lax` still attaches cookies to top-level cross-site
// navigations, which is enough for an attacker-controlled link to drive an
// authenticated GET. The cost is that arriving from an external link lands on
// the login page for one navigation — accepted deliberately.
export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

interface SessionCookies {
  token?: string | undefined;
  refreshToken?: string | undefined;
  rememberMe: boolean;
}

/**
 * Writes the session cookies onto `response`.
 *
 * Both cookies carry the *session* lifetime, not the access token's own
 * 15-minute expiry — that's enforced inside the JWT and by the backend, while
 * the cookie is only the container.
 */
export function setSessionCookies(
  response: NextResponse,
  { token, refreshToken, rememberMe }: SessionCookies
): void {
  const maxAge = sessionMaxAge(rememberMe);

  if (token) {
    response.cookies.set(AUTH_TOKEN_COOKIE, token, { ...sessionCookieOptions, maxAge });
  }
  if (refreshToken) {
    response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, { ...sessionCookieOptions, maxAge });
  }
  response.cookies.set(SESSION_REMEMBER_COOKIE, rememberMe ? '1' : '0', {
    ...sessionCookieOptions,
    maxAge,
  });
  // Every fresh session cookie write resets the idle clock, whether it's a
  // login or a silent refresh — both are proof the session is genuinely live.
  touchActivityCookie(response);
}

interface CookieReader {
  cookies: { get(name: string): { value: string } | undefined };
}

/** Reads back the remember-me choice made at login. Defaults to the short session. */
export function readRememberMe(request: CookieReader): boolean {
  return request.cookies.get(SESSION_REMEMBER_COOKIE)?.value === '1';
}

/** Expires every session cookie. Options must match the ones used to set them. */
export function clearSessionCookies(response: NextResponse): void {
  const expired = { ...sessionCookieOptions, maxAge: 0 };
  response.cookies.set(AUTH_TOKEN_COOKIE, '', expired);
  response.cookies.set(REFRESH_TOKEN_COOKIE, '', expired);
  response.cookies.set(SESSION_REMEMBER_COOKIE, '', expired);
  clearActivityCookie(response);
}

/**
 * Expires only the access-token cookie, leaving the refresh token in place.
 *
 * For a cookie that doesn't decode as a usable JWT: that's not proof the
 * session is over (the refresh token is opaque and backend-validated), just
 * proof this particular cookie is unusable. Clearing both would discard a
 * live session and orphan its backend row.
 */
export function clearAuthTokenCookie(response: NextResponse): void {
  response.cookies.set(AUTH_TOKEN_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 });
}
