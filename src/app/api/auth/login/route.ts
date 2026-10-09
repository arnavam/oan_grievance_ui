import { AUTH_MESSAGES } from '@/lib/authMessages';
import { getClientIp } from '@/lib/clientIp';
import { checkCsrf } from '@/lib/csrf';
import { logger } from '@/lib/logger';
import { BackendAuthError, callBackendAuth, type TokenPair } from '@/lib/oanAuthBackend';
import { buildRateLimitKey, checkRateLimit, rateLimitedResponse, RATE_LIMITS } from '@/lib/rateLimit';
import { setSessionCookies } from '@/lib/session';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const clientIp = getClientIp(request);
  const body = await request.json().catch(() => ({}));
  const usr = body?.usr;
  const pwd = body?.pwd;
  const rememberMe = body?.rememberMe === true;

  if (!usr || !pwd) {
    return NextResponse.json({ message: 'Missing credentials in request' }, { status: 400 });
  }

  // Keyed by IP *and* the attempted account: when clientIp can't be trusted
  // (no reverse proxy configured — see clientIp.ts) every caller collapses to
  // the same "unknown" bucket, and a single flood would otherwise lock every
  // user out of login at once. Scoping by account too means an attacker can
  // still exhaust one account's own budget, but can no longer take down
  // everyone else's in the process.
  const limitKey = buildRateLimitKey('login', clientIp, { identity: String(usr) });
  const limit = checkRateLimit(limitKey, RATE_LIMITS.login.limit, RATE_LIMITS.login.windowMs);
  if (!limit.allowed) {
    logger.security(`Login rate limit exceeded for ${clientIp}`);
    return rateLimitedResponse(limit.retryAfterSeconds);
  }

  try {
    const pair = await callBackendAuth<TokenPair>(
      '/api/v1/auth/login',
      { usr, pwd, remember_me: rememberMe },
      clientIp
    );

    const nextResponse = NextResponse.json({
      success: true,
      user: { email: pair.user, roles: pair.roles },
    });

    setSessionCookies(nextResponse, {
      token: pair.access_token,
      refreshToken: pair.refresh_token,
      rememberMe,
    });

    return nextResponse;
  } catch (error) {
    if (error instanceof BackendAuthError) {
      // The backend's reason is logged, never returned — relaying it verbatim
      // turns a login form into an account-enumeration oracle. The one exception is
      // PASSWORD_CHANGE_REQUIRED: unlike a wrong password, it only ever fires once the
      // credentials have already verified correctly (see oan_auth_service's `login()`,
      // which calls it after `LoginManager.authenticate` succeeds), so it reveals nothing
      // an attacker couldn't already tell from a correct guess, and collapsing it into
      // "incorrect email or password" would send someone who typed their temporary
      // password exactly right down the wrong troubleshooting path.
      if (error.code === 'PASSWORD_CHANGE_REQUIRED') {
        logger.security(`Login blocked for ${clientIp}: temporary password not yet replaced`);
        return NextResponse.json({ message: AUTH_MESSAGES.passwordChangeRequired, code: error.code }, { status: 403 });
      }
      logger.security(`Login rejected for ${clientIp} with status ${error.status}: ${error.message}`);
      const status = error.status >= 500 ? 502 : 401;
      const message = error.status >= 500 ? AUTH_MESSAGES.signInUnavailable : AUTH_MESSAGES.invalidCredentials;
      return NextResponse.json({ message }, { status });
    }
    logger.error('Login proxy error:', error);
    return NextResponse.json({ message: AUTH_MESSAGES.signInUnavailable }, { status: 500 });
  }
}
