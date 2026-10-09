import { beforeEach, describe, expect, it, vi } from 'vitest';

const callBackendAuth = vi.fn();

vi.mock('@/lib/oanAuthBackend', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/oanAuthBackend')>()),
  callBackendAuth: (...args: unknown[]) => callBackendAuth(...args),
}));

import { BackendAuthError } from '@/lib/oanAuthBackend';
import { POST } from './route';

// Each test uses its own address: the route rate-limits per IP + address in
// process memory, so a shared one would make later tests hit an earlier one's budget.
function post(usr: unknown, headers: Record<string, string> = {}) {
  return POST(
    new Request('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ usr }),
    })
  );
}

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => {
    callBackendAuth.mockReset();
  });

  it('forwards the trimmed address to the backend and reports success', async () => {
    callBackendAuth.mockResolvedValue(null);

    const res = await post('  ok@example.com  ');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(callBackendAuth).toHaveBeenCalledWith(
      '/api/v1/auth/forgot-password',
      { usr: 'ok@example.com' },
      expect.any(String)
    );
  });

  it('rejects a missing or blank address without calling the backend', async () => {
    for (const usr of [undefined, '', '   ', 42]) {
      const res = await post(usr);
      expect(res.status).toBe(400);
    }
    expect(callBackendAuth).not.toHaveBeenCalled();
  });

  it('rejects a cross-origin request', async () => {
    const res = await post('csrf@example.com', { 'sec-fetch-site': 'cross-site' });
    expect(res.status).toBe(403);
    expect(callBackendAuth).not.toHaveBeenCalled();
  });

  it('reports a backend throttle as 429', async () => {
    callBackendAuth.mockRejectedValue(new BackendAuthError('Rate limit exceeded', 429));
    const res = await post('throttled@example.com');
    expect(res.status).toBe(429);
  });

  it('answers a backend failure exactly like a success, so it cannot reveal which addresses have accounts', async () => {
    // The backend returns success for an unknown address and only errors for a
    // real one it then fails to mail — relaying that would be an enumeration oracle.
    callBackendAuth.mockRejectedValue(new BackendAuthError('Email account not configured', 500));

    const res = await post('exists-but-mail-broken@example.com');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it('reports an unreachable backend as an error, since that is true for every address', async () => {
    callBackendAuth.mockRejectedValue(new TypeError('fetch failed'));
    const res = await post('down@example.com');
    expect(res.status).toBe(502);
  });

  it('throttles repeated requests for the same address', async () => {
    callBackendAuth.mockResolvedValue(null);

    const statuses: number[] = [];
    for (let i = 0; i < 7; i += 1) {
      statuses.push((await post('flood@example.com')).status);
    }

    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(statuses.slice(5)).toEqual([429, 429]);
  });
});
