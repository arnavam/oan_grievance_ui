import { AUTH_MESSAGES } from '@/lib/authMessages';
import { getClientIp } from '@/lib/clientIp';
import { checkCsrf } from '@/lib/csrf';
import { logger } from '@/lib/logger';
import { BackendAuthError, callBackendAuth } from '@/lib/oanAuthBackend';
import { buildRateLimitKey, checkRateLimit, rateLimitedResponse, RATE_LIMITS } from '@/lib/rateLimit';
import { validatePassword } from '@/lib/validation/password';
import { NextResponse } from 'next/server';

/**
 * Replaces an admin-issued temporary password (see `oan_grievance_service`'s officer
 * creation) with one only the account holder knows. Guest-reachable by necessity — login
 * refuses to mint a token while the account still holds a temporary password (`403
 * PASSWORD_CHANGE_REQUIRED`), so there is nothing to authorize this with except the
 * temporary password itself, which the backend re-verifies exactly as login would. Sets no
 * session cookies: on success the caller signs in fresh with the new password.
 */
export async function POST(request: Request) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const clientIp = getClientIp(request);
  const body = await request.json().catch(() => ({}));
  const usr = typeof body?.usr === 'string' ? body.usr.trim() : '';
  const currentPassword = body?.current_password;
  const newPassword = body?.new_password;

  if (!usr || typeof currentPassword !== 'string' || !currentPassword || typeof newPassword !== 'string' || !newPassword) {
    return NextResponse.json({ message: 'Missing required fields in request' }, { status: 400 });
  }

  // Keyed by IP and the attempted account, same reasoning as login/route.ts: a flood
  // against one account can't exhaust every other caller's shared budget.
  const limitKey = buildRateLimitKey('set-initial-password', clientIp, { identity: usr });
  const limit = checkRateLimit(limitKey, RATE_LIMITS.setInitialPassword.limit, RATE_LIMITS.setInitialPassword.windowMs);
  if (!limit.allowed) {
    logger.security(`Set-initial-password rate limit exceeded for ${clientIp}`);
    return rateLimitedResponse(limit.retryAfterSeconds);
  }

  // The form already enforces this, but a direct POST here must not get a free pass on
  // password strength — same reasoning as register/route.ts and reset-password/route.ts.
  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    return NextResponse.json({ message: passwordError }, { status: 400 });
  }
  if (newPassword === currentPassword) {
    return NextResponse.json({ message: 'Choose a password different from the temporary one.' }, { status: 400 });
  }

  try {
    await callBackendAuth(
      '/api/v1/auth/password/initial',
      { usr, current_password: currentPassword, new_password: newPassword },
      clientIp
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof BackendAuthError) {
      logger.security(`Set-initial-password rejected for ${clientIp} with status ${error.status}: ${error.message}`);
      if (error.status === 429) {
        return NextResponse.json({ message: AUTH_MESSAGES.tooManyAttempts }, { status: 429 });
      }
      if (error.status >= 500) {
        return NextResponse.json({ message: AUTH_MESSAGES.unexpected }, { status: 502 });
      }
      // The backend deliberately answers the same "Invalid login credentials" (401) for
      // an unknown account, a wrong temporary password, and an account not holding one at
      // all (see set_initial_password's own docstring) — relaying both its status and
      // message verbatim keeps that indistinguishability intact, and still lets through
      // its own 400 for a rule this route's own pre-check above didn't catch (e.g. a
      // concurrent change) without forcing every non-429/500 case into one status.
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    logger.error('Set-initial-password proxy error:', error);
    return NextResponse.json({ message: AUTH_MESSAGES.unexpected }, { status: 500 });
  }
}
