import { callBackendAuth, type TokenPair } from '@/lib/oanAuthBackend';
import { readRememberMe, REFRESH_TOKEN_COOKIE } from '@/lib/session';
import type { NextRequest } from 'next/server';

interface CookieReader {
  cookies: { get(name: string): { value: string } | undefined };
}

/**
 * Exchanges the refresh-token cookie for a fresh pair. Shared by the
 * dedicated `/api/auth/refresh` route and `/api/auth/me` (which refreshes
 * inline when the access token has expired, mirroring the 401-then-retry
 * behaviour a real API call would get from the proxy).
 *
 * Returns null on any failure — no refresh token cookie, or the backend
 * rejected it (expired, revoked, unknown). Callers treat that uniformly as
 * "no session", never distinguishing why.
 */
export async function performRefresh(
  request: NextRequest | CookieReader,
  clientIp: string
): Promise<{ pair: TokenPair; rememberMe: boolean } | null> {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) return null;

  try {
    const pair = await callBackendAuth<TokenPair>('/api/v1/auth/refresh', { refresh_token: refreshToken }, clientIp);
    return { pair, rememberMe: readRememberMe(request) };
  } catch {
    return null;
  }
}
