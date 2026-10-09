import { getClientIp } from '@/lib/clientIp';
import { checkCsrf } from '@/lib/csrf';
import { isIdleExpired, touchActivityCookie } from '@/lib/idleSession';
import { decodeAccessToken } from '@/lib/jwt';
import { buildRateLimitKey, checkRateLimit, rateLimitedResponse, RATE_LIMITS } from '@/lib/rateLimit';
import { AUTH_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/session';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Called by `useIdleTimer` on real user activity (throttled client-side to
 * roughly once a minute) to slide the idle-session window forward. This is
 * the only thing it does — it does not refresh an expired access token
 * (`/api/auth/me` and the data proxy already do that on demand) — because an
 * idle *keep-alive* has to stay cheap enough to fire on every mouse move
 * without ever itself becoming the bottleneck.
 */
export async function POST(request: NextRequest) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const clientIp = getClientIp(request);
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  const claims = token ? decodeAccessToken(token) : null;

  // Keyed by IP *and* a hash of the session's own refresh token when one is
  // present — same reasoning as login/refresh/logout: when clientIp can't be
  // trusted, every caller collapses to the same "unknown" bucket, and one
  // session's tabs firing heartbeats would otherwise exhaust the shared
  // budget for every other active session site-wide.
  const limitKey = buildRateLimitKey('heartbeat', clientIp, { secret: refreshToken });
  const limit = checkRateLimit(limitKey, RATE_LIMITS.heartbeat.limit, RATE_LIMITS.heartbeat.windowMs);
  if (!limit.allowed) return rateLimitedResponse(limit.retryAfterSeconds);

  const hasRefreshToken = !!refreshToken;

  // Nothing to keep alive: a merely-expired access token still counts (the
  // refresh token proves there's a real session behind it), only the
  // complete absence of either does not.
  if (!claims && !hasRefreshToken) {
    return NextResponse.json({ message: 'No active session' }, { status: 401 });
  }

  // A session that's already idle-expired must not be revived by the very
  // call whose only job is to slide the idle window forward — without this,
  // a heartbeat that lands after the window has lapsed (e.g. a laptop waking
  // from sleep, where a mousemove can fire before the client's own 1s idle
  // check catches up) would touch the activity cookie and undo server-side
  // idle enforcement, same as every other session-cookie entry point in
  // `isIdleExpired`'s own doc comment.
  if (isIdleExpired(!!claims || hasRefreshToken, request)) {
    return NextResponse.json({ message: 'No active session' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  touchActivityCookie(response);
  return response;
}
