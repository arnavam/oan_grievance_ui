import { getClientIp } from '@/lib/clientIp';
import { checkCsrf } from '@/lib/csrf';
import { logger } from '@/lib/logger';
import { callBackendAuth } from '@/lib/oanAuthBackend';
import { buildRateLimitKey, checkRateLimit, rateLimitedResponse, RATE_LIMITS } from '@/lib/rateLimit';
import { clearSessionCookies, REFRESH_TOKEN_COOKIE } from '@/lib/session';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const clientIp = getClientIp(request);
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  // Keyed by IP *and* a hash of the session's own refresh token when one is
  // present — same reasoning as login/refresh: when clientIp can't be
  // trusted, every caller collapses to the same "unknown" bucket, and one
  // session hammering this endpoint would otherwise exhaust the budget for
  // every other active session site-wide.
  const limitKey = buildRateLimitKey('logout', clientIp, { secret: refreshToken });
  const limit = checkRateLimit(limitKey, RATE_LIMITS.logout.limit, RATE_LIMITS.logout.windowMs);

  // A tripped limit must never leave someone signed in — clearing our own
  // cookies costs nothing and needs no upstream call, so it happens either way.
  if (!limit.allowed) {
    logger.security(`Logout rate limit exceeded for ${clientIp}; cookies cleared without revoking upstream`);
    const limited = rateLimitedResponse(limit.retryAfterSeconds);
    clearSessionCookies(limited);
    return limited;
  }

  // Revoke server-side before dropping the cookies. Clearing cookies alone
  // leaves the refresh token valid until it expires, so anyone who captured
  // it could still redeem it for a live session after "sign out".
  if (refreshToken) {
    try {
      await callBackendAuth('/api/v1/auth/logout', { refresh_token: refreshToken }, clientIp);
    } catch (error) {
      // Best-effort: a backend that's down must not trap someone in a session
      // they asked to leave. The cookies are cleared below regardless.
      logger.error('Refresh token revocation failed:', error);
    }
  }

  const response = NextResponse.json({ success: true });
  clearSessionCookies(response);
  return response;
}
