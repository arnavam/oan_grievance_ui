import { beforeEach, describe, expect, it, vi } from 'vitest';

const callBackendAuth = vi.fn();

vi.mock('@/lib/oanAuthBackend', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/oanAuthBackend')>()),
  callBackendAuth: (...args: unknown[]) => callBackendAuth(...args),
}));

import { POST } from './route';

// Each test registers a different address: the route rate-limits per IP and
// per address in process memory.
let counter = 0;
function post(extra: Record<string, unknown> = {}) {
  counter += 1;
  return POST(
    new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `user${counter}@example.com`,
        password: 'Str0ng!Passw0rd',
        full_name: 'Test User',
        phone_number: '+251911000000',
        ...extra,
      }),
    })
  );
}

function forwardedBody(): Record<string, unknown> {
  return callBackendAuth.mock.calls[0]![1] as Record<string, unknown>;
}

describe('POST /api/auth/register — submitter_type', () => {
  beforeEach(() => {
    callBackendAuth.mockReset();
    callBackendAuth.mockResolvedValue(null);
  });

  it('forwards a registrable submitter type so the backend records it on the profile', async () => {
    const res = await post({ submitter_type: 'Development Agent' });

    expect(res.status).toBe(200);
    expect(callBackendAuth).toHaveBeenCalledWith(
      '/api/v1/auth/register',
      expect.objectContaining({ submitter_type: 'Development Agent' }),
      expect.any(String)
    );
  });

  it('sends no submitter_type when none was chosen, leaving the backend default', async () => {
    await post();
    expect(forwardedBody()).not.toHaveProperty('submitter_type');
  });

  it('drops a type it does not recognise instead of forwarding it', async () => {
    // Includes a staff-style value: registration must not be a way to pick one.
    for (const submitter_type of ['Grievance Admin', 'Cooperative', '', 42, null, { name: 'Development Agent' }]) {
      callBackendAuth.mockClear();
      const res = await post({ submitter_type });
      expect(res.status).toBe(200);
      expect(forwardedBody()).not.toHaveProperty('submitter_type');
    }
  });

  it('never forwards role fields, whatever the caller sends', async () => {
    await post({ submitter_type: 'Development Agent', role: 'Grievance Admin', roles: ['System Manager'] });
    const body = forwardedBody();
    expect(body).not.toHaveProperty('role');
    expect(body).not.toHaveProperty('roles');
  });
});
