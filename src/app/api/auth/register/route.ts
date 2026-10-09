import { AUTH_MESSAGES } from '@/lib/authMessages';
import { getClientIp, hasTrustedProxyConfigured } from '@/lib/clientIp';
import { checkCsrf } from '@/lib/csrf';
import { logger } from '@/lib/logger';
import { BackendAuthError, callBackendAuth, type TokenPair } from '@/lib/oanAuthBackend';
import { buildRateLimitKey, checkRateLimit, rateLimitedResponse, RATE_LIMITS } from '@/lib/rateLimit';
import { validatePassword } from '@/lib/validation/password';
import { isRegistrableSubmitterType } from '@/lib/validation/submitterType';
import { PHONE_NUMBER_E164_REGEX } from '@/lib/validation/phone';
import { NextResponse } from 'next/server';

/**
 * Registration issues a token pair too, but this route deliberately discards
 * it and sets no cookies — the UX is "account created, now sign in", not an
 * auto-login. That is unchanged from before this route existed; the point of
 * routing it through here at all is the same protections every credential
 * endpoint gets (CSRF, per-IP rate limit, no backend URL exposed to the browser).
 */
export async function POST(request: Request) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const clientIp = getClientIp(request);

  // Pure per-IP limit, checked before the body is even parsed — unlike
  // login (where a fake username achieves nothing for an attacker), a fake
  // *registration* email is exactly what a spam-account flood wants to
  // submit, so scoping the limit by email alone (or IP+email) lets an
  // attacker mint a fresh rate-limit budget on every request just by
  // varying the email — the account-scoped key that's the right call for
  // login would quietly disable flood protection here. This IP-only check
  // is what actually bounds total registration attempts from one source,
  // and running it first also means a flood of malformed/empty bodies still
  // counts against the caller's budget instead of skipping rate-limiting
  // entirely by never reaching a body-shaped check.
  //
  // Widened to `registerShared` on a deployment with no trusted proxy
  // configured — see that config's own comment in rateLimit.ts for why.
  //
  // Gated on whether the *deployment* trusts a proxy at all
  // (`hasTrustedProxyConfigured`), not on whether *this* request happened to
  // resolve to `UNKNOWN_CLIENT_IP` — those aren't the same thing. A
  // deployment that does trust a proxy can still see an individual request
  // resolve to unknown (a missing or malformed forwarding header on just
  // that request); keying the widened limit off the per-request result
  // would hand anyone who can make one request look anomalous a 10x larger
  // flood budget than the deployment intended. Picked as a whole config
  // (limit *and* window) rather than mixing fields, so a deployment
  // overriding RATE_LIMIT_REGISTER_SHARED_WINDOW_MS actually takes effect
  // instead of silently keeping `register`'s window.
  const ipRateLimitConfig = hasTrustedProxyConfigured() ? RATE_LIMITS.register : RATE_LIMITS.registerShared;
  const ipLimit = checkRateLimit(
    buildRateLimitKey('register', clientIp),
    ipRateLimitConfig.limit,
    ipRateLimitConfig.windowMs
  );
  if (!ipLimit.allowed) {
    logger.security(`Register rate limit exceeded for ${clientIp}`);
    return rateLimitedResponse(ipLimit.retryAfterSeconds);
  }

  const body = await request.json().catch(() => ({}));
  const { email, password, full_name, phone_number, submitter_type } = body ?? {};

  if (!email || !password || !full_name || !phone_number) {
    return NextResponse.json({ message: 'Missing required fields in request' }, { status: 400 });
  }

  // Secondary, tighter limit on IP+email — defense in depth against one
  // specific email being hammered repeatedly (e.g. probing whether it's
  // already registered), on top of the IP-wide flood cap above. When
  // clientIp can't be trusted (no reverse proxy configured), this key
  // collapses toward the IP-only one above rather than replacing it, so the
  // site-wide protection doesn't depend on email uniqueness.
  const emailLimitKey = buildRateLimitKey('register-email', clientIp, { identity: String(email) });
  const emailLimit = checkRateLimit(emailLimitKey, RATE_LIMITS.register.limit, RATE_LIMITS.register.windowMs);
  if (!emailLimit.allowed) {
    logger.security(`Register rate limit exceeded for ${clientIp} (email-scoped)`);
    return rateLimitedResponse(emailLimit.retryAfterSeconds);
  }

  // The client already enforces these, but a direct POST here (bypassing the
  // form) must not get a free pass on password strength or phone shape —
  // this must not rely solely on the upstream backend to catch it.
  const passwordError = validatePassword(password);
  if (passwordError) {
    return NextResponse.json({ message: passwordError }, { status: 400 });
  }
  if (typeof phone_number !== 'string' || !PHONE_NUMBER_E164_REGEX.test(phone_number)) {
    return NextResponse.json({ message: 'Phone number must be a valid international number.' }, { status: 400 });
  }

  try {
    await callBackendAuth<TokenPair>(
      '/api/v1/auth/register',
      {
        email,
        password,
        full_name,
        phone_number,
        // Allowlisted rather than passed through: an unrecognised value is
        // dropped (the backend then registers the default type) instead of
        // being forwarded for the backend to reject or, worse, accept.
        ...(isRegistrableSubmitterType(submitter_type) ? { submitter_type } : {}),
      },
      clientIp
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof BackendAuthError) {
      // Unlike login, the backend's validation message here IS useful to the
      // caller ("email already exists", password complexity) — it does not
      // reveal anything about someone else's account.
      logger.security(`Registration rejected for ${clientIp} with status ${error.status}: ${error.message}`);
      const status = error.status >= 500 ? 502 : 400;
      return NextResponse.json(
        { message: error.status >= 500 ? AUTH_MESSAGES.unexpected : error.message },
        { status }
      );
    }
    logger.error('Register proxy error:', error);
    return NextResponse.json({ message: AUTH_MESSAGES.unexpected }, { status: 500 });
  }
}
