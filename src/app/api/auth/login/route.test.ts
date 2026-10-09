import { beforeEach, describe, expect, it, vi } from 'vitest';

const callBackendAuth = vi.fn();

vi.mock('@/lib/oanAuthBackend', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/oanAuthBackend')>()),
  callBackendAuth: (...args: unknown[]) => callBackendAuth(...args),
}));

import { BackendAuthError } from '@/lib/oanAuthBackend';
import { POST } from './route';

// Each test logs in as a different address: the route rate-limits per IP and per address
// in process memory.
let counter = 0;
function post(extra: Record<string, unknown> = {}) {
  counter += 1;
  return POST(
    new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usr: `officer${counter}@example.com`, pwd: 'Welcome2026', ...extra }),
    })
  );
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    callBackendAuth.mockReset();
  });

  it('answers 403 with a distinct message when the backend reports PASSWORD_CHANGE_REQUIRED', async () => {
    callBackendAuth.mockRejectedValue(
      new BackendAuthError('You must set your own password before signing in.', 403, 'PASSWORD_CHANGE_REQUIRED')
    );

    const res = await post();
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.code).toBe('PASSWORD_CHANGE_REQUIRED');
    expect(body.message).toMatch(/set your own password/i);
    expect(body.message).not.toMatch(/incorrect email or password/i);
  });

  it('still answers 401 with the generic message for an ordinary wrong password', async () => {
    callBackendAuth.mockRejectedValue(new BackendAuthError('Invalid login credentials', 401));

    const res = await post();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.message).toMatch(/incorrect email or password/i);
    expect(body.code).toBeUndefined();
  });

  it('answers 502 for a backend outage, not the password-change message', async () => {
    callBackendAuth.mockRejectedValue(new BackendAuthError('Internal Server Error', 503));

    const res = await post();
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.message).toMatch(/could not sign you in/i);
  });
});
