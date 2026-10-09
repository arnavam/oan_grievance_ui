import { beforeEach, describe, expect, it, vi } from 'vitest';

const callBackendAuth = vi.fn();

vi.mock('@/lib/oanAuthBackend', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/oanAuthBackend')>()),
  callBackendAuth: (...args: unknown[]) => callBackendAuth(...args),
}));

import { BackendAuthError } from '@/lib/oanAuthBackend';
import { POST } from './route';

const STRONG_PASSWORD = 'Str0ng!Passw0rd';

// Each test uses its own key: the route rate-limits per IP + key in process
// memory, so a shared one would make later tests hit an earlier one's budget.
function post(body: object, headers: Record<string, string> = {}) {
  return POST(
    new Request('http://localhost/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    })
  );
}

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => {
    callBackendAuth.mockReset();
  });

  it('forwards the key and new password to the backend and reports success', async () => {
    callBackendAuth.mockResolvedValue(null);

    const res = await post({ key: '  key-ok  ', new_password: STRONG_PASSWORD });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(callBackendAuth).toHaveBeenCalledWith(
      '/api/v1/auth/reset-password',
      { key: 'key-ok', new_password: STRONG_PASSWORD },
      expect.any(String)
    );
  });

  it('sets no session cookies — a reset ends sessions, it does not start one', async () => {
    callBackendAuth.mockResolvedValue(null);
    const res = await post({ key: 'key-cookies', new_password: STRONG_PASSWORD });
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('rejects a missing key or password without calling the backend', async () => {
    for (const body of [{}, { key: 'key-missing' }, { new_password: STRONG_PASSWORD }, { key: '  ', new_password: STRONG_PASSWORD }]) {
      expect((await post(body)).status).toBe(400);
    }
    expect(callBackendAuth).not.toHaveBeenCalled();
  });

  it('rejects a weak password itself, without relying on the backend', async () => {
    const res = await post({ key: 'key-weak', new_password: 'password' });

    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/number|special|character/i);
    expect(callBackendAuth).not.toHaveBeenCalled();
  });

  it('rejects a cross-origin request', async () => {
    const res = await post({ key: 'key-csrf', new_password: STRONG_PASSWORD }, { 'sec-fetch-site': 'cross-site' });
    expect(res.status).toBe(403);
    expect(callBackendAuth).not.toHaveBeenCalled();
  });

  it('relays the backend reason when the key is used or invalid', async () => {
    callBackendAuth.mockRejectedValue(
      new BackendAuthError('The reset password link has either been used before or is invalid', 410)
    );

    const res = await post({ key: 'key-bad', new_password: STRONG_PASSWORD });

    expect(res.status).toBe(400);
    expect((await res.json()).message).toBe('The reset password link has either been used before or is invalid');
  });

  it('hides a backend server error behind generic copy', async () => {
    callBackendAuth.mockRejectedValue(new BackendAuthError('Traceback: internal detail', 500));

    const res = await post({ key: 'key-500', new_password: STRONG_PASSWORD });

    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain('internal detail');
  });

  it('reports a backend throttle as 429', async () => {
    callBackendAuth.mockRejectedValue(new BackendAuthError('Rate limit exceeded', 429));
    expect((await post({ key: 'key-429', new_password: STRONG_PASSWORD })).status).toBe(429);
  });

  it('throttles repeated attempts against the same key', async () => {
    callBackendAuth.mockRejectedValue(new BackendAuthError('invalid', 410));

    const statuses: number[] = [];
    for (let i = 0; i < 7; i += 1) {
      statuses.push((await post({ key: 'key-flood', new_password: STRONG_PASSWORD })).status);
    }

    expect(statuses.slice(0, 5)).toEqual([400, 400, 400, 400, 400]);
    expect(statuses.slice(5)).toEqual([429, 429]);
  });
});
