import { getClientIp } from '@/lib/clientIp';
import { checkCsrf } from '@/lib/csrf';
import { buildRateLimitKey, checkRateLimit, rateLimitedResponse, RATE_LIMITS } from '@/lib/rateLimit';
import { isLocale, LOCALE_COOKIE } from '@/i18n/locales';
import { NextResponse } from 'next/server';

/**
 * Sets the UI-language cookie `src/i18n/request.ts` reads on every request.
 * Not session/auth state — doesn't go through session.ts — so it's fine for
 * this to be a plain unauthenticated cookie write, readable before login too
 * (the login/register pages should honour the chosen language as well). Not
 * session state doesn't mean not a mutating same-origin POST, though — it
 * still gets the same CSRF check and rate limit every other route here does.
 */
export async function POST(request: Request) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const clientIp = getClientIp(request);
  const limit = checkRateLimit(buildRateLimitKey('locale', clientIp), RATE_LIMITS.locale.limit, RATE_LIMITS.locale.windowMs);
  if (!limit.allowed) return rateLimitedResponse(limit.retryAfterSeconds);

  const body = await request.json().catch(() => ({}));
  const locale = body?.locale;

  if (typeof locale !== 'string' || !isLocale(locale)) {
    return NextResponse.json({ message: 'Unsupported locale' }, { status: 400 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
  return response;
}
