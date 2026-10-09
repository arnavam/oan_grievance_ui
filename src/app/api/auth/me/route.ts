import { getClientIp } from '@/lib/clientIp';
import { isIdleExpired } from '@/lib/idleSession';
import { decodeAccessToken, isExpired } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { AUTH_TOKEN_COOKIE, clearSessionCookies, REFRESH_TOKEN_COOKIE, setSessionCookies } from '@/lib/session';
import { performRefresh } from '@/lib/sessionRefresh';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * The session-restore probe AuthBootstrapGate calls on mount.
 *
 * Reads claims out of the access-token cookie itself, refreshing first if it's
 * expired (the cookie carries the *session* lifetime, not the 15-minute
 * access-token lifetime, so an expired access token with a live refresh token
 * is the common case, not an edge case).
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
  const hasRefreshToken = !!request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  const claims = token ? decodeAccessToken(token) : null;

  // proxy.ts excludes /api/* from its matcher, so this is the only place
  // a page that restores its session via this route ever gets checked for
  // idle expiry — a stale-but-technically-valid token pair must not restore
  // a session the user was actually idled out of.
  if (isIdleExpired(!!claims || hasRefreshToken, request)) {
    const response = NextResponse.json({ message: 'No active session' }, { status: 401 });
    clearSessionCookies(response);
    return response;
  }

  if (claims && !isExpired(claims)) {
    return NextResponse.json({ email: claims.sub, roles: claims.roles });
  }

  try {
    const clientIp = getClientIp(request);
    const result = await performRefresh(request, clientIp);
    if (!result) {
      const response = NextResponse.json({ message: 'No active session' }, { status: 401 });
      clearSessionCookies(response);
      return response;
    }

    const refreshedClaims = decodeAccessToken(result.pair.access_token);
    if (!refreshedClaims) {
      logger.error('Refreshed access token did not decode as a valid JWT');
      const response = NextResponse.json({ message: 'No active session' }, { status: 401 });
      clearSessionCookies(response);
      return response;
    }

    const response = NextResponse.json({ email: refreshedClaims.sub, roles: refreshedClaims.roles });
    setSessionCookies(response, {
      token: result.pair.access_token,
      refreshToken: result.pair.refresh_token,
      rememberMe: result.rememberMe,
    });
    return response;
  } catch (error) {
    logger.error('Session restore error:', error);
    return NextResponse.json({ message: 'No active session' }, { status: 401 });
  }
}
