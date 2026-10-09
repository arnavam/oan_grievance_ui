/** Local mobile number digits, excluding any country/dial code prefix. */
export const PHONE_NUMBER_LENGTH = 10;

/**
 * A local Ethiopian mobile number as typed in the phone box: either a 9-digit
 * national significant number (e.g. 911234567 or 711234567) or a 10-digit
 * domestic number with a leading trunk `0` (e.g. 0911234567 or 0711234567).
 *
 * Mirrors the backend's own rule — `oan_grievance_service`'s `normalise_mobile` /
 * `MOBILE_PATTERN` (services/submission.py) strips a leading `0` (or `+251`)
 * and then requires exactly `^[79]\d{8}$` on what's left.
 */
export const PHONE_NUMBER_REGEX = /^0?[79]\d{8}$/;

/** The dial code this app has an actual, backend-confirmed local-number rule for. */
export const ETHIOPIA_DIAL_CODE = '+251';

export function isEthiopianDialCode(dialCode: string): boolean {
  return dialCode === ETHIOPIA_DIAL_CODE;
}

/**
 * The local-number check for every country the backend doesn't (yet) have a
 * real rule for. The phone-country picker already offers Kenya, Tanzania,
 * Uganda, Rwanda, Somalia, Djibouti, Mozambique and the US alongside
 * Ethiopia, but `oan_grievance_service`'s `normalise_mobile` only actually
 * validates Ethiopian numbers today (it explicitly rejects Tanzania/Kenya/
 * Somalia/Sudan codes as "confusable", and has no rule for the rest at all).
 * Inventing a per-country length/leading-digit rule here would just be a
 * second guess sitting next to the backend's real one and drifting from it
 * the moment that work ships — this only rules out what's clearly not a
 * phone number (too short, too long, non-digits), the same tolerance this
 * module already gives a trusted, backend-prefilled E.164 value.
 */
export const GENERIC_LOCAL_PHONE_REGEX = /^\d{4,14}$/;

/**
 * True for a local number that's valid for whichever dial code is selected:
 * the real Ethiopian rule for +251, or the generic sanity check above for
 * every other country until the backend has one of its own.
 */
export function isValidLocalPhoneForCountry(digits: string, dialCode: string): boolean {
  return isEthiopianDialCode(dialCode) ? PHONE_NUMBER_REGEX.test(digits) : GENERIC_LOCAL_PHONE_REGEX.test(digits);
}

/** Dial codes the phone-country picker offers alongside Ethiopia — see `DEFAULT_COUNTRY_CODES` in PhoneField.tsx. */
export const KNOWN_COUNTRY_CODES = ['+251', '+254', '+255', '+256', '+250', '+252', '+253', '+258', '+1'];

/**
 * General E.164 — shared by this module and `src/app/api/auth/register/
 * route.ts` (which imports this constant rather than keeping its own copy,
 * since the form there sends a number already combined with a country/dial
 * code, the same shape this one accepts alongside the bare local form).
 * Deliberately loose (8-15 digits, not pinned to a specific country's
 * length): per-country length is libphonenumber's call on the backend, and
 * this is only a shape check until the frontend uses the same metadata.
 */
export const PHONE_NUMBER_E164_REGEX = /^\+\d{8,15}$/;

/**
 * True for either the bare local form a user types — valid for whichever
 * `dialCode` is currently selected, see `isValidLocalPhoneForCountry` — or
 * the E.164 form a live profile already comes in as. `dialCode` defaults to
 * Ethiopia so an existing caller that hasn't been updated to pass one yet
 * keeps today's (Ethiopia-only) behaviour rather than silently loosening.
 */
export function isValidPhoneNumber(value: string, dialCode: string = ETHIOPIA_DIAL_CODE): boolean {
  return isValidLocalPhoneForCountry(value, dialCode) || PHONE_NUMBER_E164_REGEX.test(value);
}
/** Strips every non-digit character (spaces, dashes, parens, `+`, letters). */
export function toDigitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Drops a single leading trunk `0` from a local number before it's
 * concatenated with a country/dial code (e.g. domestic "0911000000" ->
 * "911000000" so "+251" + result is valid E.164, not "+2510911000000").
 */
export function stripLeadingZero(digits: string): string {
  return digits.replace(/^0/, '');
}

export interface ParsedPhone {
  phoneCode: string;
  phoneNumber: string;
}

/**
 * Splits an E.164 or raw phone string into its dial code and local subscriber digits.
 * e.g. "+251911234567" -> { phoneCode: "+251", phoneNumber: "911234567" }
 * e.g. "0911234567" -> { phoneCode: "+251", phoneNumber: "0911234567" }
 */
export function splitPhoneNumber(rawPhone?: string | null): ParsedPhone {
  if (!rawPhone || !rawPhone.trim()) {
    return { phoneCode: '+251', phoneNumber: '' };
  }
  const trimmed = rawPhone.trim();

  if (trimmed.startsWith('+')) {
    const matched = KNOWN_COUNTRY_CODES.find((code) => trimmed.startsWith(code));
    if (matched) {
      const rest = toDigitsOnly(trimmed.slice(matched.length));
      return { phoneCode: matched, phoneNumber: rest };
    }
    const generic = trimmed.match(/^(\+\d{1,3})(\d+)$/);
    if (generic && generic[1] && generic[2]) {
      return { phoneCode: generic[1], phoneNumber: generic[2] };
    }
  }

  const digits = toDigitsOnly(trimmed);
  if (digits.startsWith('251') && digits.length >= 12) {
    return { phoneCode: '+251', phoneNumber: digits.slice(3) };
  }

  return { phoneCode: '+251', phoneNumber: digits };
}

/**
 * Normalizes a phone number and country code into canonical E.164 format (+<code><digits>).
 * Handles:
 * - Already in E.164 form: "+251911234567" -> "+251911234567"
 * - Domestic form with trunk 0: "0911234567", "+251" -> "+251911234567"
 * - Bare subscriber digits: "911234567", "+251" -> "+251911234567"
 * - Country code accidentally typed in local box: "251911234567", "+251" -> "+251911234567"
 */
export function formatToE164(phoneNumber?: string | null, phoneCode: string = '+251'): string {
  if (!phoneNumber) return '';
  const trimmed = phoneNumber.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('+')) {
    return trimmed;
  }

  const digits = toDigitsOnly(trimmed);
  if (!digits) return '';

  const codeDigits = toDigitsOnly(phoneCode);
  if (codeDigits && digits.startsWith(codeDigits) && digits.length > codeDigits.length + 6) {
    return `+${digits}`;
  }

  const cleanCode = phoneCode.startsWith('+') ? phoneCode : `+${phoneCode}`;
  const localDigits = stripLeadingZero(digits);
  return `${cleanCode}${localDigits}`;
}
