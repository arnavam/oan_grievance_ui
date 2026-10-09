import { validatePassword } from './password';
import { isEthiopianDialCode, isValidLocalPhoneForCountry } from './phone';

// Per-field rules shared by every form that validates inline (register, login,
// forgot/reset password). Pure functions returning the message to show under
// the field, or null when it's fine — so the same rule runs on blur, on
// change-after-error and on submit, and is testable without rendering a form.
//
// Limits mirror the backend's own (oan_auth_service's RegisterUserSchema:
// full_name 1-140, password 8-128 with complexity), so a value the backend
// would reject is caught here first with a reason next to the field.

/** Practical, not RFC-exhaustive — the same bar the browser's `type="email"` sets, enforced explicitly. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const EMAIL_MAX_LENGTH = 254;
export const FULL_NAME_MAX_LENGTH = 140;
/** Matches oan_grievance_service's MIN_DESCRIPTION_LENGTH. */
export const MIN_DESCRIPTION_LENGTH = 20;

export function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Enter your email address.';
  if (trimmed.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(trimmed)) {
    return 'Enter a valid email address, e.g. name@example.com.';
  }
  return null;
}

export function validateFullName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Enter your full name.';
  if (trimmed.length > FULL_NAME_MAX_LENGTH) {
    return `Full name must be ${FULL_NAME_MAX_LENGTH} characters or fewer.`;
  }
  return null;
}

/**
 * The local digits a user types, checked against whichever dial code is
 * selected. Ethiopia gets the backend's own, exact rule; every other country
 * gets a loose sanity check only — the backend has no real per-country rule
 * yet, so this deliberately doesn't invent one (see `phone.ts`).
 */
export function validateLocalPhone(digits: string, dialCode: string): string | null {
  if (!digits) return 'Enter your phone number.';
  if (!isValidLocalPhoneForCountry(digits, dialCode)) {
    return isEthiopianDialCode(dialCode)
      ? 'Enter a valid Ethiopian mobile number, e.g. 0911234567 or 911234567 (starts with 09, 07, 9, or 7).'
      : 'Enter a valid phone number for the selected country.';
  }
  return null;
}

/**
 * For a temporary password an admin types on someone else's behalf (creating an officer, or
 * issuing a new one). Deliberately weaker than `validateNewPassword`/`PASSWORD_RULES` — no
 * symbol required — mirroring `oan_auth_service`'s own `validate_temporary_password`: it's
 * handed off by hand and used exactly once, after which `/api/v1/auth/password/initial`
 * demands the full rule for the password that replaces it.
 */
export function validateTemporaryPassword(value: string): string | null {
  if (!value) return 'Enter a temporary password.';
  if (value.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return 'Password must contain at least one letter and one number.';
  }
  return null;
}

/** Same rule as `validateLocalPhone`, but empty is valid — for forms where the phone is optional. */
export function validateOptionalLocalPhone(digits: string, dialCode: string): string | null {
  return digits ? validateLocalPhone(digits, dialCode) : null;
}

/** For choosing a new password (register, reset). Reports the first unmet rule. */
export function validateNewPassword(value: string): string | null {
  if (!value) return 'Enter a password.';
  return validatePassword(value);
}

export function validatePasswordConfirmation(password: string, confirmation: string): string | null {
  if (!confirmation) return 'Re-enter your password to confirm it.';
  return confirmation === password ? null : 'Passwords do not match.';
}

/**
 * For signing in. Presence only — never the strength rules, which would both
 * hint at the password policy and reject an older password that predates it.
 */
export function validateLoginPassword(value: string): string | null {
  return value ? null : 'Enter your password.';
}

export function validateRequired(value: string, message: string): string | null {
  return value.trim() ? null : message;
}

// --- Register: account step -------------------------------------------------

export const ACCOUNT_FIELDS = ['fullName', 'email', 'phoneNumber', 'password', 'confirmPassword'] as const;
export type AccountField = (typeof ACCOUNT_FIELDS)[number];
/** `countryCode` is the phone box's own dial-code selection, not itself a validated field. */
export type AccountValues = Record<AccountField, string> & { countryCode: string };

export function validateAccountField(field: AccountField, values: AccountValues): string | null {
  switch (field) {
    case 'fullName':
      return validateFullName(values.fullName);
    case 'email':
      return validateEmail(values.email);
    case 'phoneNumber':
      return validateLocalPhone(values.phoneNumber, values.countryCode);
    case 'password':
      return validateNewPassword(values.password);
    case 'confirmPassword':
      return validatePasswordConfirmation(values.password, values.confirmPassword);
  }
}

/** Every failing field of the account step, in form order. Empty when the step is valid. */
export function validateAccount(values: AccountValues): Partial<Record<AccountField, string>> {
  const errors: Partial<Record<AccountField, string>> = {};
  for (const field of ACCOUNT_FIELDS) {
    const message = validateAccountField(field, values);
    if (message) errors[field] = message;
  }
  return errors;
}
