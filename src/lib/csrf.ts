import { NextResponse } from 'next/server';

// Same-origin CSRF guard for state-changing API routes.
//
// Browsers always attach an `Origin` header to cross-site requests and to
// state-changing same-origin requests. A forged cross-site request therefore
// carries the attacker's origin, which won't match our host. `Sec-Fetch-Site`
// is checked too — it's set by the browser itself and can't be written by
// page script.
//
// Returns a 403 NextResponse when the request must be blocked, otherwise null.
export function checkCsrf(request: Request): NextResponse | null {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    return NextResponse.json({ message: 'Cross-origin request blocked' }, { status: 403 });
  }

  const origin = request.headers.get('origin');
  if (!origin) return null;

  const host = request.headers.get('host');

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return NextResponse.json({ message: 'Invalid Origin header' }, { status: 403 });
  }

  if (!host || originHost !== host) {
    return NextResponse.json({ message: 'Cross-origin request blocked' }, { status: 403 });
  }

  return null;
}
