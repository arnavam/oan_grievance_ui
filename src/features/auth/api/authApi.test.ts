import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { forgotPassword, getMe, registerUser, resetPassword } from './authApi';

describe('authApi - registerUser', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('sends the chosen submitter type to /api/auth/register, and only when there is one', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true }) } as Response);
    const base = { email: 'a@example.com', password: 'Str0ng!Passw0rd', full_name: 'A B', phone_number: '+251911000000' };

    await registerUser({ ...base, submitter_type: 'Development Agent' });
    await registerUser(base);

    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0]![0]).toBe('/api/auth/register');
    expect(JSON.parse(calls[0]![1].body)).toEqual({ ...base, submitter_type: 'Development Agent' });
    expect(JSON.parse(calls[1]![1].body)).toEqual(base);
  });
});

describe('authApi - password reset', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function mockFetch(status: number, body: object) {
    global.fetch = vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as Response);
    return global.fetch as ReturnType<typeof vi.fn>;
  }

  it('forgotPassword posts the address to /api/auth/forgot-password', async () => {
    const fetchMock = mockFetch(200, { success: true });

    await expect(forgotPassword('a@example.com')).resolves.toBeUndefined();

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/auth/forgot-password');
    expect(JSON.parse(init.body)).toEqual({ usr: 'a@example.com' });
  });

  it('forgotPassword surfaces the route message on failure', async () => {
    mockFetch(429, { message: 'Too many attempts. Please wait a moment and try again.' });
    await expect(forgotPassword('a@example.com')).rejects.toThrow('Too many attempts');
  });

  it('resetPassword posts the key and new password to /api/auth/reset-password', async () => {
    const fetchMock = mockFetch(200, { success: true });

    await expect(resetPassword('the-key', 'Str0ng!Passw0rd')).resolves.toBeUndefined();

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/auth/reset-password');
    expect(JSON.parse(init.body)).toEqual({ key: 'the-key', new_password: 'Str0ng!Passw0rd' });
  });

  it('resetPassword surfaces the route message on failure, and falls back to generic copy without one', async () => {
    mockFetch(400, { message: 'The reset password link has either been used before or is invalid' });
    await expect(resetPassword('k', 'Str0ng!Passw0rd')).rejects.toThrow('used before or is invalid');

    mockFetch(500, {});
    await expect(resetPassword('k', 'Str0ng!Passw0rd')).rejects.toThrow('Something went wrong');
  });
});

describe('authApi - getMe()', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('calls /api/v1/auth/me and extracts only needed user profile fields', async () => {
    const rawBackendResponse = {
      data: {
        claims: {
          exp: 1789627820,
          iat: 1789626920,
          iss: 'mysite.localhost',
          jti: '1XiH27ZkoQI-NqdyPajl4Q',
          roles: ['Grievance Submitter'],
          sub: 'da6907bd8356e207@id.openagrinet.internal',
          typ: 'access',
        },
        first_name: 'Abebe',
        full_name: 'Abebe Bikila',
        last_name: 'Bikila',
        login_email: 'abebe.farmer.344012394@example.com',
        mobile_no: '+251934401239',
        profiles: {
          grievance: {
            administrative_area: 'kebele-ET140108101008',
            administrative_unit: 'Kebele 01 Center',
            identities: [{ scheme: 'fayda', value: 'ET-FAYDA-344012394' }],
            preferred_language: 'en',
            profile_id: 'SUB-00141',
            type: 'Individual Farmer',
          },
        },
        roles: ['Grievance Submitter'],
        user: 'da6907bd8356e207@id.openagrinet.internal',
      },
      message: 'Success',
      meta: {
        api_version: 'v1',
        status: 'current',
      },
      request_id: 'e82e3417-66c5-45ea-8c97-0c274d31c469',
      status: 'success',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => rawBackendResponse,
    } as Response);

    const user = await getMe();

    // Verify proxy URL was called
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const calledUrl = (global.fetch as any).mock.calls[0][0]; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(calledUrl).toContain('/api/proxy/api/v1/auth/me');

    // Verify needed fields are present
    expect(user.full_name).toBe('Abebe Bikila');
    expect(user.type).toBe('Individual Farmer');
    expect(user.email).toBe('abebe.farmer.344012394@example.com');
    expect(user.mobile_no).toBe('+251934401239');
    expect(user.fayda_id).toBe('ET-FAYDA-344012394');
    expect(user.profile_id).toBe('SUB-00141');
    expect(user.roles).toEqual(['Grievance Submitter']);
    expect(user.administrative_area).toBe('kebele-ET140108101008');
    expect(user.administrative_unit).toBe('Kebele 01 Center');
    expect(user.preferred_language).toBe('en');

    // Verify unnecessary fields are NOT leaked into User
    expect((user as any).claims).toBeUndefined(); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect((user as any).meta).toBeUndefined(); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect((user as any).request_id).toBeUndefined(); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect((user as any).profiles).toBeUndefined(); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect((user as any).status).toBeUndefined(); // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  it('throws sessionExpired if data is missing or unauthorized', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized' }),
    } as Response);

    await expect(getMe()).rejects.toThrow('UNAUTHORIZED');
  });
});
