import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { backendResponse, cookieRequest, iamToken } from '@/lib/iamTestFixtures';
import { decodeLoginOption, encodeLoginOption } from '@/lib/loginOption';
import { GET } from './route';

const fetchMock = vi.fn();
const STARTED = encodeLoginOption({ key: 'staff', cookie_prefix: '' });

function land(cookies: Record<string, string>, query = '') {
  return GET(cookieRequest(`http://localhost:3000/api/auth/iam/complete${query}`, cookies));
}

const me = (roles: string[]) =>
  backendResponse(200, { user: 'u1', login_email: 'a@b.c', roles, login_option: 'staff', cookie_prefix: '' });

describe('GET /api/auth/iam/complete', () => {
  beforeEach(() => {
    process.env.AUTH_API_BASE_URL = 'http://auth.internal/api';
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    delete process.env.AUTH_API_BASE_URL;
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('records the roles from /me, drops any local session, and navigates on with a meta refresh', async () => {
    fetchMock.mockResolvedValueOnce(me(['Grievance Officer']));
    const token = iamToken();

    const res = await land({ login_option: STARTED, 'X-Access-Token': token, auth_token: 'old' }, '?returnUrl=%2Fall-grievances');

    expect(res.status).toBe(200);
    expect(await res.text()).toContain('content="0;url=/all-grievances"');
    expect(new Headers(fetchMock.mock.calls[0]![1].headers).get('authorization')).toBe(`Bearer ${token}`);
    expect(decodeLoginOption(res.cookies.get('login_option')?.value)).toMatchObject({
      sub: 'kc-user-1',
      roles: ['Grievance Officer'],
    });
    expect(res.headers.getSetCookie().join('\n')).toMatch(/auth_token=;.*Max-Age=0/);
  });

  it('sends a user with no role here back with no_access, keeping the option for a sign-out', async () => {
    fetchMock.mockResolvedValueOnce(me([]));
    const res = await land({ login_option: STARTED, 'X-Access-Token': iamToken() });
    expect(res.headers.get('location')).toBe('http://localhost:3000/login?reason=no_access');
    expect(decodeLoginOption(res.cookies.get('login_option')?.value)?.roles).toEqual([]);
    expect(res.headers.getSetCookie().join('\n')).not.toContain('X-Access-Token');
  });

  it('refuses a user whose roles the option does not admit, keeping the option for a sign-out', async () => {
    fetchMock.mockResolvedValueOnce(me(['Grievance Submitter']));
    const res = await land({ login_option: STARTED, 'X-Access-Token': iamToken() });
    expect(res.headers.get('location')).toBe('http://localhost:3000/login?reason=wrong_portal');
    expect(decodeLoginOption(res.cookies.get('login_option')?.value)?.roles).toEqual(['Grievance Submitter']);
  });

  it('fails without a recorded option or token, and tells a dropped oversized token apart', async () => {
    expect((await land({ 'X-Access-Token': iamToken() })).headers.get('location')).toContain('reason=login_failed');
    expect((await land({ login_option: STARTED })).headers.get('location')).toContain('reason=login_failed');
    expect((await land({ login_option: STARTED, 'X-ID-Token': 'id' })).headers.get('location')).toContain(
      'reason=token_too_large'
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps a 401 to no_access and a 503 to login_unavailable', async () => {
    fetchMock.mockResolvedValueOnce(backendResponse(401, 'no'));
    expect((await land({ login_option: STARTED, 'X-Access-Token': iamToken() })).headers.get('location')).toContain(
      'reason=no_access'
    );
    fetchMock.mockResolvedValueOnce(backendResponse(503, 'down'));
    expect((await land({ login_option: STARTED, 'X-Access-Token': iamToken() })).headers.get('location')).toContain(
      'reason=login_unavailable'
    );
  });
});
