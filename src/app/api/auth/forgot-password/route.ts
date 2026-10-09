import { AUTH_MESSAGES } from '@/lib/authMessages';
import { getClientIp } from '@/lib/clientIp';
import { checkCsrf } from '@/lib/csrf';
import { logger } from '@/lib/logger';
import { BackendAuthError, callBackendAuth } from '@/lib/oanAuthBackend';
import { buildRateLimitKey, checkRateLimit, rateLimitedResponse, RATE_LIMITS } from '@/lib/rateLimit';
import { NextResponse } from 'next/server';

// Generous for any real address, tight enough that this can't be used to
// stuff an arbitrary blob through to the backend's lookup.
const MAX_IDENTIFIER_LENGTH = 254;

export async function POST(request: Request) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const clientIp = getClientIp(request);
  const body = await request.json().catch(() => ({}));
  const usr = typeof body?.usr === 'string' ? body.usr.trim() : '';

  if (!usr || usr.length > MAX_IDENTIFIER_LENGTH) {
    return NextResponse.json({ message: 'Enter the email address for your account.' }, { status: 400 });
  }

  // Keyed by IP *and* the requested account, same as login: with no trusted
  // proxy configured every caller shares the `unknown` IP, and an IP-only key
  // would let one flood block reset requests for everyone. The account scope
  // also caps how many reset mails one address can be made to receive.
  const limitKey = buildRateLimitKey('forgot-password', clientIp, { identity: usr });
  const limit = checkRateLimit(limitKey, RATE_LIMITS.forgotPassword.limit, RATE_LIMITS.forgotPassword.windowMs);
  if (!limit.allowed) {
    logger.security(`Forgot-password rate limit exceeded for ${clientIp}`);
    return rateLimitedResponse(limit.retryAfterSeconds);
  }

  try {
    await callBackendAuth('/api/v1/auth/forgot-password', { usr }, clientIp);
  } catch (error) {
    if (!(error instanceof BackendAuthError)) {
      // The service itself is unreachable — true whatever address was typed,
      // so saying so reveals nothing about any account.
      logger.error('Forgot-password proxy error:', error);
      return NextResponse.json({ message: AUTH_MESSAGES.unexpected }, { status: 502 });
    }

    if (error.status === 429) {
      logger.security(`Forgot-password throttled by the backend for ${clientIp}`);
      return NextResponse.json({ message: AUTH_MESSAGES.tooManyAttempts }, { status: 429 });
    }

    // Any other backend rejection is swallowed on purpose. The backend answers
    // an unknown address with the same success message it gives a real one, so
    // it only ever *errors* for an address that exists (a mail server that
    // isn't set up, say) — surfacing that here would hand a caller the account
    // enumeration the backend was written to prevent. The reason is logged
    // instead, where an operator can see it.
    logger.error(`Forgot-password backend error (status ${error.status}): ${error.message}`);
  }

  return NextResponse.json({ success: true });
}
