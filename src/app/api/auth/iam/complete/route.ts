import { homeRouteForRoles } from '@/features/auth/rbac';
import { getClientIp } from '@/lib/clientIp';
import { isAccessTokenDropped, lookupIamUser, readIamSession, readLoginOption } from '@/lib/iamSession';
import { safeReturnPath } from '@/lib/returnPath';
import { clearLocalSessionCookies, setLoginOptionCookie } from '@/lib/session';
import { relativeRedirect } from '@/lib/relativeRedirect';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function backToLogin(reason: string): NextResponse {
  return relativeRedirect(`/login?reason=${reason}`);
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Where an IAM login lands once IAM has opened the session: the URL
 * `/api/auth/iam/login` gave as the post-login redirect. IAM's cookies
 * (shared parent domain) arrive with this request; the `login_option` cookie
 * says which prefix to read them under.
 *
 * The user is looked up through oan_auth_service's `/auth/me` (which creates
 * them on first sign-in) and their roles recorded in `login_option`. A user
 * with no role here is sent back with `no_access` — their IAM session is left
 * alone, it is still valid for the apps it is for — but the option stays
 * recorded, so "Sign out and use a different account" can end it.
 *
 * Answers with a tiny page that navigates on, not a 30x: the redirect chain
 * that got here started at the identity provider, and a browser withholds
 * `SameSite=Strict` cookies on every hop of a chain that started cross-site.
 * A navigation this page starts itself is same-site.
 */
export async function GET(request: NextRequest) {
  const option = readLoginOption(request);
  if (!option) return backToLogin('login_failed');

  const session = readIamSession(request);
  if (!session?.accessToken) {
    return backToLogin(isAccessTokenDropped(request, option) ? 'token_too_large' : 'login_failed');
  }

  const lookup = await lookupIamUser(session.accessToken, getClientIp(request));
  if (lookup.status === 'unavailable') return backToLogin('login_unavailable');
  if (lookup.status === 'unauthorized') return backToLogin('no_access');
  // The token under this option's prefix was issued through another option.
  if (lookup.option.cookie_prefix !== option.cookie_prefix) return backToLogin('login_failed');
  if (!lookup.option.roles?.length) {
    const response = backToLogin('no_access');
    setLoginOptionCookie(response, lookup.option);
    return response;
  }

  const target =
    safeReturnPath(request.nextUrl.searchParams.get('returnUrl')) ?? homeRouteForRoles(lookup.option.roles);
  const href = escapeHtml(target);

  const response = new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${href}"><title>Signing in</title></head><body><a href="${href}">Continue</a></body></html>`,
    {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
      },
    }
  );
  // At most one session kind at a time: drop any local session the browser
  // still held, so `readActiveSession` (which prefers local) can't mix them.
  clearLocalSessionCookies(response);
  setLoginOptionCookie(response, lookup.option);
  return response;
}
