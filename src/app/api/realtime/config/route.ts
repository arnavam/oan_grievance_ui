import { getClientIp } from '@/lib/clientIp';
import { checkCsrf } from '@/lib/csrf';
import { env } from '@/lib/env';
import { isIdleExpired } from '@/lib/idleSession';
import { decodeAccessToken, isExpired } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { buildRateLimitKey, checkRateLimit, rateLimitedResponse, RATE_LIMITS } from '@/lib/rateLimit';
import { AUTH_TOKEN_COOKIE, clearSessionCookies, REFRESH_TOKEN_COOKIE, setSessionCookies } from '@/lib/session';
import { performRefresh } from '@/lib/sessionRefresh';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const MIN_TOKEN_LIFETIME_SECONDS = 30;
const NO_STORE = { 'Cache-Control': 'no-store' };

function noSession() {
  const response = NextResponse.json({ message: 'No active session' }, { status: 401, headers: NO_STORE });
  clearSessionCookies(response);
  return response;
}

export async function POST(request: NextRequest) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  let realtime: typeof env.REALTIME;
  try {
    realtime = env.REALTIME;
  } catch (error) {
    logger.error('Realtime is misconfigured:', error);
    realtime = null;
  }
  if (!realtime) {
    return NextResponse.json({ enabled: false }, { headers: NO_STORE });
  }

  const clientIp = getClientIp(request);
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  const claims = token ? decodeAccessToken(token) : null;

  const limitKey = buildRateLimitKey('realtime-config', clientIp, { secret: refreshToken });
  const limit = checkRateLimit(limitKey, RATE_LIMITS.realtimeConfig.limit, RATE_LIMITS.realtimeConfig.windowMs);
  if (!limit.allowed) return rateLimitedResponse(limit.retryAfterSeconds);

  if (isIdleExpired(!!claims || !!refreshToken, request)) return noSession();

  const connection = { enabled: true, url: realtime.url, site: realtime.site, path: realtime.path };

  if (token && claims && !isExpired(claims, MIN_TOKEN_LIFETIME_SECONDS)) {
    return NextResponse.json(connection, { headers: NO_STORE });
  }

  try {
    const result = await performRefresh(request, clientIp);
    if (!result) return noSession();

    const response = NextResponse.json(connection, { headers: NO_STORE });
    setSessionCookies(response, {
      token: result.pair.access_token,
      refreshToken: result.pair.refresh_token,
      rememberMe: result.rememberMe,
    });
    return response;
  } catch (error) {
    logger.error('Realtime config refresh error:', error);
    return NextResponse.json({ message: 'No active session' }, { status: 401, headers: NO_STORE });
  }
}
