import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackendAuthError } from '@/lib/oanAuthBackend';

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

const FAYDA_ID = '6557092147530500';

describe('POST /api/auth/register — submitter fields', () => {
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

  it('forwards the submitter type and a 12- or 16-digit Fayda ID together', async () => {
    for (const fayda_id of ['655709214753', FAYDA_ID]) {
      callBackendAuth.mockClear();
      const res = await post({ submitter_type: 'Individual Farmer', fayda_id });

      expect(res.status).toBe(200);
      expect(forwardedBody()).toMatchObject({ submitter_type: 'Individual Farmer', fayda_id });
    }
  });

  it('registers an NGO or FPO under its type with the representative’s Fayda ID and no registration number', async () => {
    for (const submitter_type of ['NGO', 'FPO']) {
      callBackendAuth.mockClear();
      // Even if a caller sends one, no registration number reaches the backend.
      const res = await post({ submitter_type, fayda_id: FAYDA_ID, registration_number: 'REG-2024/0042' });

      expect(res.status).toBe(200);
      expect(forwardedBody()).toMatchObject({ submitter_type, fayda_id: FAYDA_ID });
      expect(forwardedBody()).not.toHaveProperty('registration_number');
    }
  });

  it('refuses an NGO / FPO whose Fayda ID is not 12 or 16 digits, without calling the backend', async () => {
    for (const submitter_type of ['NGO', 'FPO']) {
      const res = await post({ submitter_type, fayda_id: '12345' });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ message: 'Fayda ID must be a 12- or 16-digit number.' });
    }
    expect(callBackendAuth).not.toHaveBeenCalled();
  });
  it('refuses a type it does not support, without calling the backend', async () => {
    // Includes a staff-style value: registration must not be a way to pick one.
    for (const submitter_type of ['Grievance Admin', 'Cooperative', '', 42, null, { name: 'Development Agent' }]) {
      const res = await post({ submitter_type });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ message: 'Unsupported submitter type.' });
    }
    expect(callBackendAuth).not.toHaveBeenCalled();
  });

  it('refuses a Fayda ID that is not 12 or 16 digits, without calling the backend', async () => {
    for (const fayda_id of ['12345', '1234567890123', '65570921475305001', 'ET-FAYDA-344012394', '', 6557092147530500]) {
      const res = await post({ submitter_type: 'Individual Farmer', fayda_id });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ message: 'Fayda ID must be a 12- or 16-digit number.' });
    }
    expect(callBackendAuth).not.toHaveBeenCalled();
  });

  it('never forwards a submission channel, so the backend registers the account under its default', async () => {
    const res = await post({ submitter_type: 'Individual Farmer', fayda_id: FAYDA_ID, submission_channel: 'Carrier Pigeon' });

    expect(res.status).toBe(200);
    expect(forwardedBody()).not.toHaveProperty('submission_channel');
  });

  it('does not pass unknown fields through', async () => {
    await post({
      submitter_type: 'Individual Farmer',
      fayda_id: FAYDA_ID,
      dedupe_key: 'fayda:1',
      administrative_area: 'x',
    });
    expect(Object.keys(forwardedBody()).sort()).toEqual(
      ['email', 'fayda_id', 'full_name', 'password', 'phone_number', 'submitter_type'].sort()
    );
  });

  it('never forwards role fields, whatever the caller sends', async () => {
    await post({ submitter_type: 'Development Agent', role: 'Grievance Admin', roles: ['System Manager'] });
    const body = forwardedBody();
    expect(body).not.toHaveProperty('role');
    expect(body).not.toHaveProperty('roles');
  });
});

describe('POST /api/auth/register — backend rejections', () => {
  beforeEach(() => {
    callBackendAuth.mockReset();
  });

  it("passes the backend's validation message through so the form can show it", async () => {
    callBackendAuth.mockRejectedValue(
      new BackendAuthError("Submitter Type 'Space Farmer' does not exist.", 400, 'VALIDATION_ERROR')
    );
    const res = await post({ submitter_type: 'Development Agent' });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ message: "Submitter Type 'Space Farmer' does not exist." });
  });

  it('keeps a duplicate Fayda ID as a 409 with its message', async () => {
    const message = "A Submitter Profile with dedupe key 'fayda:6557…' is already registered under another account.";
    callBackendAuth.mockRejectedValue(new BackendAuthError(message, 409, 'DUPLICATE_ENTRY'));
    const res = await post({ submitter_type: 'Individual Farmer', fayda_id: FAYDA_ID });

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ message });
  });
});
