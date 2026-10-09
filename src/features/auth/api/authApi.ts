import { AUTH_MESSAGES } from '@/lib/authMessages';
import { fetchApi } from '@/lib/api';
import { logger } from '@/lib/logger';
import type { User } from '@/features/auth/store/authSlice';

interface LoginCredentials {
  usr: string;
  pwd: string;
  rememberMe?: boolean;
}

export interface BackendAuthMeData {
  user?: string;
  login_email?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  mobile_no?: string;
  country_code?: string;
  phone_number?: string;
  roles?: string[];
  profiles?: {
    grievance?: {
      active?: number;
      administrative_area?: string | null;
      administrative_unit?: string | null;
      contact_email?: string | null;
      contact_mobile?: string | null;
      country_code?: string | null;
      phone_number?: string | null;
      department?: string | null;
      /** e.g. `[{ scheme: "fayda", value: "3214..." }]` — see `resolveFaydaId`. */
      identities?: Array<{ scheme?: string | null; value?: string | null }> | null;
      full_name?: string | null;
      identity_scheme?: string | null;
      identity_value?: string | null;
      is_blocked?: number;
      preferred_language?: string | null;
      profile_id?: string | null;
      registration_number?: string | null;
      role?: string | null;
      role_level?: string | null;
      type?: string | null;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * The backend never sends a flat `fayda_id` — a submitter's national ID
 * comes back as one entry in `profiles.grievance.identities` (the same
 * scheme/value pairs `dedupe_key` is built from; see
 * `grievance_submitter_profile.py`'s `split_dedupe_key`). Not every
 * submitter has one: a Development Agent or a phone-only registrant's
 * `identities` array simply won't contain a `"fayda"` entry.
 */
export function resolveFaydaId(
  identities: Array<{ scheme?: string | null; value?: string | null }> | null | undefined
): string | undefined {
  return identities?.find((i) => i.scheme === 'fayda')?.value ?? undefined;
}

export async function loginUser({ usr, pwd, rememberMe = false }: LoginCredentials): Promise<User> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ usr, pwd, rememberMe }),
  });

  const data = (await res.json().catch(() => ({}))) as { message?: string; user?: User };

  if (!res.ok) {
    throw new Error(data.message || AUTH_MESSAGES.invalidCredentials);
  }
  if (!data.user) {
    logger.error('Malformed login response: user is missing');
    throw new Error(AUTH_MESSAGES.signInUnavailable);
  }

  return data.user;
}

export interface RegisterFields {
  email: string;
  password: string;
  full_name: string;
  phone_number: string;
  /** Backend submitter type to register as (see `backendSubmitterTypeFor`). Omit for the default, Individual Farmer. */
  submitter_type?: string;
}

/** Does not sign the caller in — see the route: registration is "account created, now log in". */
export async function registerUser(fields: RegisterFields): Promise<void> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'include',
    body: JSON.stringify(fields),
  });

  const data = (await res.json().catch(() => ({}))) as { message?: string };

  if (!res.ok) {
    throw new Error(data.message || AUTH_MESSAGES.unexpected);
  }
}

/**
 * Asks for a password-reset message for `usr` (the account's sign-in email).
 *
 * Resolves the same way whether or not an account exists — the route
 * deliberately doesn't say — so a resolved call means "request accepted", never
 * "account found". Only a throttle or an unreachable service rejects.
 */
export async function forgotPassword(usr: string): Promise<void> {
  const res = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ usr }),
  });

  const data = (await res.json().catch(() => ({}))) as { message?: string };

  if (!res.ok) {
    throw new Error(data.message || AUTH_MESSAGES.unexpected);
  }
}

/**
 * Sets a new password using the `key` from the reset email. Like registration
 * this does not sign anyone in — the backend revokes the account's existing
 * sessions on a reset, so the caller is sent to the login page afterwards.
 */
export async function resetPassword(key: string, newPassword: string): Promise<void> {
  const res = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ key, new_password: newPassword }),
  });

  const data = (await res.json().catch(() => ({}))) as { message?: string };

  if (!res.ok) {
    throw new Error(data.message || AUTH_MESSAGES.unexpected);
  }
}

/**
 * Replaces an admin-issued temporary password with one only the account holder knows.
 * Like `resetPassword`, this does not sign anyone in and the backend ends the account's
 * existing sessions — the caller signs in fresh afterwards.
 */
export async function setInitialPassword(usr: string, currentPassword: string, newPassword: string): Promise<void> {
  const res = await fetch('/api/auth/set-initial-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ usr, current_password: currentPassword, new_password: newPassword }),
  });

  const data = (await res.json().catch(() => ({}))) as { message?: string };

  if (!res.ok) {
    throw new Error(data.message || AUTH_MESSAGES.unexpected);
  }
}

/**
 * Clears the server-side session cookies. Returns whether the server
 * confirmed it — callers should still reset client auth state either way.
 */
export async function logoutUser(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    if (!res.ok) {
      logger.security(`Logout refused by the server with status ${res.status}`);
      return false;
    }
    return true;
  } catch (error) {
    logger.error('Logout request failed:', error);
    return false;
  }
}

/**
 * Slides the idle-session window forward. Best-effort, like `logoutUser` —
 * a dropped heartbeat should never surface as a user-facing error, it just
 * means the idle clock keeps ticking until the next one lands.
 */
export async function sendHeartbeat(): Promise<void> {
  try {
    const res = await fetch('/api/auth/heartbeat', { method: 'POST', credentials: 'include' });
    if (!res.ok) {
      logger.security(`Heartbeat refused by the server with status ${res.status}`);
    }
  } catch (error) {
    logger.error('Heartbeat request failed:', error);
  }
}

/**
 * Fetches and validates /api/v1/auth/me. `fetchApi` already flattens the
 * response envelope (`.data`/`.message.data`) before returning, so what
 * comes back here is already the flat shape — no further unwrapping needed.
 */
async function fetchAndValidateMe(): Promise<BackendAuthMeData> {
  const d = await fetchApi<BackendAuthMeData>('/api/v1/auth/me', { method: 'GET' });
  if (!d || (!d.user && !d.login_email && !d.full_name)) {
    throw new Error(AUTH_MESSAGES.sessionExpired);
  }
  return d;
}

/**
 * Restores the user session from the backend /api/v1/auth/me endpoint via proxy.
 * Only extracts needed profile and identity fields; discards unnecessary backend metadata/claims.
 */
export async function getMe(): Promise<User> {
  const d = await fetchAndValidateMe();
  const grievanceProfile = d.profiles?.grievance;
  const fullName = d.full_name || grievanceProfile?.full_name || d.login_email || d.user || 'User';
  const email = d.login_email || d.user || '';
  const type = grievanceProfile?.type || d.roles?.[0] || 'Grievance Submitter';

  return {
    email,
    roles: d.roles || [],
    full_name: fullName,
    first_name: d.first_name || undefined,
    last_name: d.last_name || undefined,
    mobile_no: d.mobile_no || grievanceProfile?.contact_mobile || undefined,
    country_code: d.country_code || grievanceProfile?.country_code || undefined,
    phone_number: d.phone_number || grievanceProfile?.phone_number || undefined,
    type,
    profile_id: grievanceProfile?.profile_id || undefined,
    fayda_id: resolveFaydaId(grievanceProfile?.identities),
    administrative_area: grievanceProfile?.administrative_area || undefined,
    administrative_unit: grievanceProfile?.administrative_unit || undefined,
    preferred_language: grievanceProfile?.preferred_language || undefined,
  };
}

/**
 * The full, unmapped /api/v1/auth/me response — for the Profile page only.
 * `getMe()` above deliberately narrows this down to the slim `User` shape
 * Redux carries everywhere else (header, prefill, etc.); this is for the one
 * screen that needs the rest (role, department, registration number, and so
 * on) and would rather read it straight from the backend than grow `User`
 * with fields nothing else uses.
 */
export async function getFullProfile(): Promise<BackendAuthMeData> {
  return fetchAndValidateMe();
}
