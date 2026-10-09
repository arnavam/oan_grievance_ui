import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/sessionRefresh', () => ({ performRefresh: vi.fn() }));

import { performRefresh } from '@/lib/sessionRefresh';
import { POST } from './route';

function tokenWithExp(expSeconds: number): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none' })}.${encode({ sub: 'officer@example.org', roles: [], exp: expSeconds })}.sig`;
}

function request(cookies: Record<string, string>, headers: Record<string, string> = {}) {
  const cookie = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
  return new NextRequest('http://localhost:3000/api/realtime/token', {
    method: 'POST',
    headers: { cookie, host: 'localhost:3000', ...headers },
  });
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

describe('POST /api/realtime/token', () => {
  beforeEach(() => {
    process.env.REALTIME_PUBLIC_URL = 'wss://grievance.example.org';
    process.env.REALTIME_SITE = 'grievance.local';
  });

  afterEach(() => {
    delete process.env.REALTIME_PUBLIC_URL;
    delete process.env.REALTIME_SITE;
    vi.mocked(performRefresh).mockReset();
  });

  it('reports realtime as disabled when it is not configured', async () => {
    delete process.env.REALTIME_PUBLIC_URL;
    const response = await POST(request({ auth_token: tokenWithExp(nowSeconds() + 600), last_activity: '1' }));
    expect(await response.json()).toEqual({ enabled: false });
  });

  it('hands out a live access token with the socket location, never cached', async () => {
    const token = tokenWithExp(nowSeconds() + 600);
    const response = await POST(request({ auth_token: token, last_activity: '1' }));

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({
      enabled: true,
      url: 'wss://grievance.example.org',
      site: 'grievance.local',
      path: '/socket.io/',
    });
    expect(performRefresh).not.toHaveBeenCalled();
  });

  it('refreshes a token that would expire before the handshake', async () => {
    const fresh = tokenWithExp(nowSeconds() + 900);
    vi.mocked(performRefresh).mockResolvedValue({
      pair: { access_token: fresh, refresh_token: 'r2' } as never,
      rememberMe: false,
    });

    const response = await POST(
      request({ auth_token: tokenWithExp(nowSeconds() + 10), refresh_token: 'r1', last_activity: '1' })
    );

    expect(response.status).toBe(200);
    expect(response.cookies.get('auth_token')?.value).toBe(fresh);
  });

  it('refuses an idle-expired session', async () => {
    const response = await POST(request({ auth_token: tokenWithExp(nowSeconds() + 600) }));
    expect(response.status).toBe(401);
  });

  it('refuses a cross-site request', async () => {
    const response = await POST(
      request({ auth_token: tokenWithExp(nowSeconds() + 600), last_activity: '1' }, { 'sec-fetch-site': 'cross-site' })
    );
    expect(response.status).toBe(403);
  });
});
