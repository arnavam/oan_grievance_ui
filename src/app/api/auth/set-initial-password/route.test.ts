import { beforeEach, describe, expect, it, vi } from 'vitest';

const callBackendAuth = vi.fn();

vi.mock('@/lib/oanAuthBackend', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/oanAuthBackend')>()),
  callBackendAuth: (...args: unknown[]) => callBackendAuth(...args),
}));

import { BackendAuthError } from '@/lib/oanAuthBackend';
import { POST } from './route';

const STRONG_PASSWORD = 'Str0ng!Passw0rd';

// Each test logs in as a different address: the route rate-limits per IP + account in
// process memory, so a shared one would make later tests hit an earlier one's budget.
let counter = 0;
function post(extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  counter += 1;
  return POST(
    new Request('http://localhost/api/auth/set-initial-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({
        usr: `officer${counter}@example.com`,
        current_password: 'Welcome2026',
        new_password: STRONG_PASSWORD,
        ...extra,
      }),
    })
  );
}

describe('POST /api/auth/set-initial-password', () => {
  beforeEach(() => {
    callBackendAuth.mockReset();
  });

  it('forwards usr, current_password, and new_password to the backend and reports success', async () => {
    callBackendAuth.mockResolvedValue(null);

    const res = await post({ usr: '  officer@example.com  ' });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(callBackendAuth).toHaveBeenCalledWith(
      '/api/v1/auth/password/initial',
      { usr: 'officer@example.com', current_password: 'Welcome2026', new_password: STRONG_PASSWORD },
      expect.any(String)
    );
  });

  it('sets no session cookies — this does not sign anyone in', async () => {
    callBackendAuth.mockResolvedValue(null);
    const res = await post();
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('rejects a missing usr, current_password, or new_password without calling the backend', async () => {
    for (const extra of [
      { usr: '' },
      { current_password: '' },
      { new_password: '' },
    ]) {
      expect((await post(extra)).status).toBe(400);
    }
    expect(callBackendAuth).not.toHaveBeenCalled();
  });

  it('rejects a weak new password itself, without relying on the backend', async () => {
    const res = await post({ new_password: 'password' });

    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/number|special|character/i);
    expect(callBackendAuth).not.toHaveBeenCalled();
  });

  it('rejects a new password identical to the temporary one, without relying on the backend', async () => {
    const res = await post({ current_password: STRONG_PASSWORD, new_password: STRONG_PASSWORD });

    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/different from the temporary/i);
    expect(callBackendAuth).not.toHaveBeenCalled();
  });

  it('rejects a cross-origin request', async () => {
    const res = await post({}, { 'sec-fetch-site': 'cross-site' });
    expect(res.status).toBe(403);
    expect(callBackendAuth).not.toHaveBeenCalled();
  });

  it('relays the backend\'s status and message for a wrong or unknown credential', async () => {
    callBackendAuth.mockRejectedValue(new BackendAuthError('Invalid login credentials', 401));

    const res = await post();

    expect(res.status).toBe(401);
    expect((await res.json()).message).toBe('Invalid login credentials');
  });

  it('hides a backend server error behind generic copy', async () => {
    callBackendAuth.mockRejectedValue(new BackendAuthError('Traceback: internal detail', 500));

    const res = await post();

    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain('internal detail');
  });

  it('reports a backend throttle as 429', async () => {
    callBackendAuth.mockRejectedValue(new BackendAuthError('Rate limit exceeded', 429));
    expect((await post()).status).toBe(429);
  });

  it('throttles repeated attempts against the same account', async () => {
    callBackendAuth.mockRejectedValue(new BackendAuthError('Invalid login credentials', 401));

    const statuses: number[] = [];
    for (let i = 0; i < 12; i += 1) {
      statuses.push((await post({ usr: 'flood@example.com' })).status);
    }

    expect(statuses.slice(0, 10)).toEqual(new Array(10).fill(401));
    expect(statuses.slice(10)).toEqual([429, 429]);
  });
});
