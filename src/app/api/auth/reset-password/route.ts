import { AUTH_MESSAGES } from '@/lib/authMessages';
import { getClientIp } from '@/lib/clientIp';
import { checkCsrf } from '@/lib/csrf';
import { logger } from '@/lib/logger';
import { BackendAuthError, callBackendAuth } from '@/lib/oanAuthBackend';
import { buildRateLimitKey, checkRateLimit, rateLimitedResponse, RATE_LIMITS } from '@/lib/rateLimit';
import { validatePassword } from '@/lib/validation/password';
import { NextResponse } from 'next/server';

// Frappe reset keys are 56-character hashes; this only bounds what gets
// forwarded, it is not a format check.
const MAX_KEY_LENGTH = 200;

/**
 * Completes a reset started by `/api/auth/forgot-password`. Sets no cookies:
 * the backend revokes the account's live sessions on a successful reset, so the
 * next step is signing in with the new password, not carrying on as before.
 */
export async function POST(request: Request) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const clientIp = getClientIp(request);
  const body = await request.json().catch(() => ({}));
  const key = typeof body?.key === 'string' ? body.key.trim() : '';
  const newPassword = body?.new_password;

  if (!key || key.length > MAX_KEY_LENGTH || typeof newPassword !== 'string' || !newPassword) {
    return NextResponse.json({ message: 'Missing required fields in request' }, { status: 400 });
  }

  // Scoped by a hash of the key being redeemed, so repeated attempts against
  // one key are throttled without one caller's traffic (or the shared
  // `unknown` IP) using up everyone else's budget.
  const limitKey = buildRateLimitKey('reset-password', clientIp, { secret: key });
  const limit = checkRateLimit(limitKey, RATE_LIMITS.resetPassword.limit, RATE_LIMITS.resetPassword.windowMs);
  if (!limit.allowed) {
    logger.security(`Reset-password rate limit exceeded for ${clientIp}`);
    return rateLimitedResponse(limit.retryAfterSeconds);
  }

  // The form already enforces this, but a direct POST here must not get a free
  // pass on password strength — same reasoning as register/route.ts.
  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    return NextResponse.json({ message: passwordError }, { status: 400 });
  }

  try {
    await callBackendAuth('/api/v1/auth/reset-password', { key, new_password: newPassword }, clientIp);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof BackendAuthError) {
      logger.security(`Password reset rejected for ${clientIp} with status ${error.status}: ${error.message}`);
      if (error.status === 429) {
        return NextResponse.json({ message: AUTH_MESSAGES.tooManyAttempts }, { status: 429 });
      }
      if (error.status >= 500) {
        return NextResponse.json({ message: AUTH_MESSAGES.unexpected }, { status: 502 });
      }
      // Unlike login, the backend's reason is useful here ("link already used
      // or invalid") and says nothing about which account the key belonged to.
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    logger.error('Reset-password proxy error:', error);
    return NextResponse.json({ message: AUTH_MESSAGES.unexpected }, { status: 500 });
  }
}
