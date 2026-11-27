import { AUTH_MESSAGES } from '@/lib/authMessages';
import { fetchApi } from '@/lib/api';
import { logger } from '@/lib/logger';
import type { User, UserOrganisation } from '@/features/auth/store/authSlice';
import { toOrganisationStatus } from '@/lib/organisationStatus';

interface LoginCredentials {
  usr: string;
  pwd: string;
  rememberMe?: boolean;
}

/** `profiles.grievance.organization` in `/auth/me`. */
export interface BackendOrganization {
  id?: string | null;
  legal_name?: string | null;
  brand_name?: string | null;
  org_type?: string | null;
  entity_type?: string | null;
  registration_number?: string | null;
  representative_name?: string | null;
  status?: string | null;
  status_reason?: string | null;
  can_file?: boolean | null;
}

export interface BackendAuthMeData {
  user?: string;
  login_email?: string;
  first_name?: string;
  last_name?: string;
  country_code?: string;
  phone_number?: string;
  roles?: string[];
  profiles?: {
    grievance?: {
      active?: number;
      administrative_area?: string | null;
      id_source?: string | null;
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
      /** An NGO / FPO representative's registered organisation — absent until it is registered. */
      organization?: BackendOrganization | null;
      /** The backend submitter type name, e.g. `Individual Farmer` — same value as `type` for a submitter. */
      submitter_type?: string | null;
      /** The channel the account was registered through, by name, e.g. `Web Portal`. */
      submission_channel?: string | null;
      /** The Fayda ID itself. `null` unless the profile is Fayda-anchored. */
      fayda_id?: string | null;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * A submitter's national ID as one entry in `profiles.grievance.identities`
 * (the same scheme/value pairs `dedupe_key` is built from; see
 * `grievance_submitter_profile.py`'s `split_dedupe_key`). `getMe` prefers the
 * flat `fayda_id` the backend now sends and uses this only when that is
 * missing — a backend that hasn't rolled out yet. Not every submitter has
 * one: a Development Agent or a phone-only registrant's `identities` array
 * simply won't contain a `"fayda"` entry.
 */
export function resolveFaydaId(
  identities: Array<{ scheme?: string | null; value?: string | null }> | null | undefined
): string | undefined {
  return identities?.find((i) => i.scheme === 'fayda')?.value ?? undefined;
}

/**
 * An NGO's / FPO's registration number as the `org` entry of `identities` — where the backend
 * has it from sign-up, before the organisation is registered (the flat `registration_number`
 * on the profile is still empty then).
 */
export function resolveOrganisationNumber(
  identities: Array<{ scheme?: string | null; value?: string | null }> | null | undefined
): string | undefined {
  return identities?.find((i) => i.scheme === 'org')?.value ?? undefined;
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
  /** 12- or 16-digit Fayda ID. The backend requires one for an Individual Farmer; for an NGO / FPO it is the representative's. */
  fayda_id?: string;
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
 * Ends the session server-side. `redirectTo` is the identity provider's logout
 * URL when the session was an IAM one whose provider session could not be
 * ended server-to-server — the caller navigates there so it ends too;
 * `providerLoggedOut` is true when it was. Callers should reset client auth
 * state either way.
 */
export async function logoutUser(): Promise<{ redirectTo: string | null; providerLoggedOut: boolean }> {
  try {
    const res = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    if (!res.ok) {
      logger.security(`Logout refused by the server with status ${res.status}`);
      return { redirectTo: null, providerLoggedOut: false };
    }
    const data = (await res.json().catch(() => ({}))) as { redirectTo?: unknown; providerLoggedOut?: unknown };
    return {
      redirectTo: typeof data.redirectTo === 'string' ? data.redirectTo : null,
      providerLoggedOut: data.providerLoggedOut === true,
    };
  } catch (error) {
    logger.error('Logout request failed:', error);
    return { redirectTo: null, providerLoggedOut: false };
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
 * Whether this app's idle timeout applies to the current session — true for
 * an email/password session, false for an IAM one, whose idle timeout is the
 * identity provider's. Null when it can't be told (no session, network failure).
 */
export async function getIdleManaged(): Promise<boolean | null> {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include', headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => ({}))) as { idleManaged?: unknown };
    return typeof data.idleManaged === 'boolean' ? data.idleManaged : null;
  } catch (error) {
    logger.error('Session kind lookup failed:', error);
    return null;
  }
}

/**
 * Fetches and validates /api/v1/auth/me. `fetchApi` already flattens the
 * response envelope (`.data`) before returning, so what
 * comes back here is already the flat shape — no further unwrapping needed.
 */
/** `/auth/me` sends the name in parts; the full name is joined here. */
export function fullNameOf(d: Pick<BackendAuthMeData, 'first_name' | 'last_name'>): string {
  return [d.first_name, d.last_name].filter(Boolean).join(' ');
}

/** `/auth/me` sends the number as country code + national number; the E.164 form is joined here. */
export function mobileOf(d: Pick<BackendAuthMeData, 'country_code' | 'phone_number'>): string | undefined {
  return d.phone_number ? `${d.country_code ?? ''}${d.phone_number}` : undefined;
}

/** Whether a `/auth/me` payload names a user at all. */
export function isValidMe(d: BackendAuthMeData | null | undefined): d is BackendAuthMeData {
  return !!d && (!!d.user || !!d.login_email);
}

async function fetchAndValidateMe(): Promise<BackendAuthMeData> {
  const d = await fetchApi<BackendAuthMeData>('/api/v1/auth/me', { method: 'GET' });
  if (!isValidMe(d)) {
    throw new Error(AUTH_MESSAGES.sessionExpired);
  }
  return d;
}

/** The organisation block of `/auth/me`, or undefined when the account has none (or it has no name to show). */
export function toUserOrganisation(raw: BackendOrganization | null | undefined): UserOrganisation | undefined {
  if (!raw?.legal_name) return undefined;
  const status = toOrganisationStatus(raw.status);
  return {
    id: raw.id || null,
    legalName: raw.legal_name,
    brandName: raw.brand_name || null,
    orgType: raw.org_type || null,
    entityType: raw.entity_type || null,
    registrationNumber: raw.registration_number || null,
    representativeName: raw.representative_name || null,
    status,
    statusReason: raw.status_reason || null,
    // The backend says so itself; only if it doesn't is it worked out — and then only Active may file.
    canFile: typeof raw.can_file === 'boolean' ? raw.can_file : status === 'Active',
  };
}

/**
 * Restores the user session from the backend /api/v1/auth/me endpoint via proxy.
 * Only extracts needed profile and identity fields; discards unnecessary backend metadata/claims.
 */
export async function getMe(): Promise<User> {
  return mapMeToUser(await fetchAndValidateMe());
}

/**
 * Narrows a flat `/auth/me` payload to the `User` Redux carries. Pure, so the
 * server builds the same user the browser would (`lib/initialUser.ts`).
 */
export function mapMeToUser(d: BackendAuthMeData): User {
  const grievanceProfile = d.profiles?.grievance;
  const fullName = fullNameOf(d) || grievanceProfile?.full_name || d.login_email || d.user || 'User';
  // An IAM user (eSignet) has no login email: their `user` id is a synthetic address, so the
  // profile's own contact email comes before it.
  const email = d.login_email || grievanceProfile?.contact_email || d.user || '';
  const type = grievanceProfile?.type || d.roles?.[0] || 'Grievance Submitter';

  return {
    email,
    roles: d.roles || [],
    full_name: fullName,
    first_name: d.first_name || undefined,
    last_name: d.last_name || undefined,
    mobile_no: mobileOf(d) || grievanceProfile?.contact_mobile || undefined,
    country_code: d.country_code || grievanceProfile?.country_code || undefined,
    phone_number: d.phone_number || grievanceProfile?.phone_number || undefined,
    type,
    submitter_type: grievanceProfile?.submitter_type || undefined,
    submission_channel: grievanceProfile?.submission_channel || undefined,
    profile_id: grievanceProfile?.profile_id || undefined,
    // For an NGO / FPO this is its representative's Fayda ID, given at sign-up.
    fayda_id: grievanceProfile?.fayda_id || resolveFaydaId(grievanceProfile?.identities),
    // An NGO's / FPO's registration number once the backend holds it (it is not part of sign-up,
    // so before the organisation is registered it is normally absent).
    registration_number: grievanceProfile?.registration_number || resolveOrganisationNumber(grievanceProfile?.identities),
    id_source: grievanceProfile?.id_source || undefined,
    administrative_area: grievanceProfile?.administrative_area || undefined,
    administrative_unit: grievanceProfile?.administrative_unit || undefined,
    preferred_language: grievanceProfile?.preferred_language || undefined,
    organisation: toUserOrganisation(grievanceProfile?.organization),
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
