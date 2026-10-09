import { env } from '@/lib/env';

// Thin, server-only client for oan_auth_service's REST auth endpoints.
// Every `/api/auth/*` route calls through here rather than hitting `fetch`
// directly, so the envelope-unwrapping and error handling can't drift between
// login/register/refresh/logout.

export class BackendAuthError extends Error {
  status: number;
  /** The REST envelope's machine-readable `code` (e.g. `PASSWORD_CHANGE_REQUIRED`), when present. */
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'BackendAuthError';
    this.status = status;
    this.code = code;
  }
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  user: string;
  roles: string[];
}

/**
 * `path` is the REST route under `AUTH_API_BASE_URL` (e.g. `/api/v1/auth/login`).
 */
export async function callBackendAuth<T>(path: string, body: object, clientIp: string): Promise<T> {
  const response = await fetch(`${env.AUTH_API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Forwarded-For': clientIp,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  // REST responses are flat (`{status, data, message}`, `message` a string) —
  // unlike the classic RPC shape, which nested the same fields as an object
  // under `.message`. Only treat `.message` as the envelope when it's an
  // object, so a flat REST response's string `message` isn't mistaken for one
  // (see `authProfile.ts`'s `getMe` for the same distinction on `/auth/me`).
  const envelope = (
    data?.message && typeof data.message === 'object' ? data.message : data
  ) as { status?: string; message?: string; code?: string; data?: T } | undefined;

  if (!response.ok || envelope?.status === 'error') {
    throw new BackendAuthError(
      envelope?.message || `Request failed with status ${response.status}`,
      response.status,
      envelope?.code
    );
  }

  return (envelope?.data ?? (envelope as unknown as T));
}
