import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { backendResponse } from '@/lib/iamTestFixtures';
import { decodeLoginOption } from '@/lib/loginOption';
import { GET } from './route';

const fetchMock = vi.fn();

function start(query: string) {
  return GET(
    new NextRequest(`http://localhost:3000/api/auth/iam/login?${query}`, {
      headers: { 'x-forwarded-for': `10.2.0.${Math.random()}` },
    })
  );
}

describe('GET /api/auth/iam/login', () => {
  beforeEach(() => {
    process.env.AUTH_API_BASE_URL = 'http://auth.internal';
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    delete process.env.AUTH_API_BASE_URL;
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('sends an absolute landing URL with the sanitised returnUrl, records the option and redirects', async () => {
    fetchMock.mockResolvedValueOnce(
      backendResponse(200, { redirect_url: 'https://kc.example.org/auth', iam: 'agent', cookie_prefix: 'agent-' })
    );

    const res = await start('key=agent&returnUrl=%2Fdashboard');

    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('https://kc.example.org/auth');
    const sent = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(sent).toEqual({
      key: 'agent',
      return_url: 'http://localhost:3000/api/auth/iam/complete?returnUrl=%2Fdashboard',
    });
    const option = decodeLoginOption(res.cookies.get('login_option')?.value);
    expect(option).toEqual({ key: 'agent', cookie_prefix: 'agent-' });
    expect(res.headers.getSetCookie().join('\n')).toMatch(/login_option=.*SameSite=lax/i);
  });

  it('drops an off-site returnUrl', async () => {
    fetchMock.mockResolvedValueOnce(
      backendResponse(200, { redirect_url: 'https://kc.example.org/auth', iam: 'staff', cookie_prefix: '' })
    );
    await start('key=staff&returnUrl=%2F%2Fevil.example');
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).return_url).toBe('http://localhost:3000/api/auth/iam/complete');
  });

  it('builds the landing URL from the origin the browser sent, not the bind address', async () => {
    fetchMock.mockResolvedValueOnce(
      backendResponse(200, { redirect_url: 'https://kc.example.org/auth', iam: 'agent', cookie_prefix: 'agent-' })
    );
    await GET(new NextRequest('http://0.0.0.0:3000/api/auth/iam/login?key=agent&origin=https%3A%2F%2Fgrievance.example.org'));
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).return_url).toBe(
      'https://grievance.example.org/api/auth/iam/complete'
    );
  });

  it('ignores an origin that is not http(s)', async () => {
    fetchMock.mockResolvedValueOnce(
      backendResponse(200, { redirect_url: 'https://kc.example.org/auth', iam: 'agent', cookie_prefix: 'agent-' })
    );
    await start('key=agent&origin=javascript%3Aalert(1)');
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).return_url).toBe('http://localhost:3000/api/auth/iam/complete');
  });

  it.each([
    [400, 'login_not_offered'],
    [502, 'login_failed'],
    [503, 'login_unavailable'],
  ])('sends a %i back to the login page with %s, setting no cookie', async (status, reason) => {
    fetchMock.mockResolvedValueOnce(backendResponse(status, 'nope'));
    const res = await start('key=staff');
    expect(res.headers.get('location')).toBe(`/login?reason=${reason}`);
    expect(res.cookies.get('login_option')).toBeUndefined();
  });
});
