// Field metadata shared by every consumer of the submitter-identity forms —
// RegisterForm.tsx (features/auth) and SubmitterIdentityCard.tsx /
// ReviewAndSubmitCard.tsx (features/submit-grievance) all need the same
// per-type field list and dropdown options. Lives here, not inside any one
// UI component, precisely so it has one owner neither feature reaches into
// the other's internals to get at.

import { FIELDS as INDIVIDUAL_FIELDS } from "./SI-IndividualFarmerForm";
import { FIELDS as COOPERATIVE_FIELDS } from "./SI-CooperativeFPOForm";
import { FIELDS as NGO_FIELDS } from "./SI-NGOForm";
import { FIELDS as WOREDA_KEBELE_FIELDS } from "./SI-WoredaKebeleForm";
import { FIELDS as DEVELOPMENT_AGENT_FIELDS } from "./SI-DevelopmentAgentForm";
import type { SIFieldMeta } from "./SI-types";
import { isEthiopianDialCode, isValidPhoneNumber } from "@/lib/validation/phone";
import { EMAIL_PATTERN } from "@/lib/validation/fieldRules";

/** Which field set applies to each submitter type. */
export const SI_FIELDS_BY_TYPE: Record<string, SIFieldMeta[]> = {
  individual: INDIVIDUAL_FIELDS,
  cooperative: COOPERATIVE_FIELDS,
  ngo: NGO_FIELDS,
  woreda_kebele: WOREDA_KEBELE_FIELDS,
  development_agent: DEVELOPMENT_AGENT_FIELDS,
};

export const submitterTypeOptions = [
  { value: "individual", label: "Individual Farmer" },
  { value: "cooperative", label: "Cooperative / FPO" },
  { value: "ngo", label: "NGO" },
  { value: "woreda_kebele", label: "Woreda/Kebele Body" },
  { value: "development_agent", label: "Development Agent (on behalf)" },
];

export const submissionChannelOptions = [
  { value: "web", label: "Web Portal" },
  { value: "mobile", label: "Mobile App" },
  { value: "ivr", label: "IVR / Call Centre" },
  { value: "field_officer", label: "Field Officer Assisted" },
];

/**
 * True for a submitter type that files grievances *for other people* — a
 * Development Agent takes them from any farmer, cooperative or NGO. Such a
 * user's own details are never the grievance's submitter identity (the fields
 * on that type's form describe the farmer, see SI-DevelopmentAgentForm), so
 * it collects nothing about itself at registration, and Submit Grievance must
 * not prefill Step 1 from the signed-in account — that would drop the agent's
 * own Fayda ID, phone and email into the farmer's fields.
 */
export function submitsOnBehalfOfOthers(submitterType: string): boolean {
  return submitterType === "development_agent";
}

/**
 * Labels of the required `SI_FIELDS_BY_TYPE[type]` fields `values` is still
 * missing, skipping anything in `hiddenFields`. The one place this check is
 * made — RegisterForm.tsx (which excludes the fields it already collected on
 * its account step) and SubmitterIdentityCard.tsx (which excludes nothing)
 * both call this instead of each keeping their own copy of "empty" ("" or
 * whitespace-only). A field considered required-and-missing by one but not
 * the other would let registration accept a submitter profile that Submit
 * Grievance's own identity step would reject, or vice versa.
 */
export function getMissingRequiredFields(
  submitterType: string,
  values: Record<string, string>,
  hiddenFields: readonly string[] = []
): string[] {
  return (SI_FIELDS_BY_TYPE[submitterType] ?? [])
    .filter((field) => field.required && !hiddenFields.includes(field.key) && !values[field.key]?.trim())
    .map((field) => field.label);
}

// A Fayda (Ethiopia's national digital ID) number is exactly 16 digits — the
// shape this app asks a user to *type*. REGISTRATION_PATTERN still mirrors
// oan_grievance_service/services/identity.py's REGISTRATION_PATTERN exactly
// (3-60 char, alphanumeric-plus-separator) — the backend enforces this once a
// grievance is actually filed (grievance.submit isn't wired up on this branch
// yet, but the fields collected here go straight into that same call once it
// is). A format the backend will reject is worth catching here first, rather
// than as a confusing rejection once that wiring lands.
const FAYDA_PATTERN = /^\d{16}$/;
// A signed-in account's own `fayda_id` (see initialIdentity.ts, which prefills
// this field from it) comes back from oan_auth_service in its own issued
// shape, e.g. "ET-FAYDA-344012394" — never raw digits. Without this, every
// returning user's genuine, already-verified Fayda ID fails FAYDA_PATTERN the
// moment Step 1 renders, blocking a grievance they never touched this field
// for. Requires at least one letter (unlike REGISTRATION_PATTERN) so this
// stays an escape hatch for the backend's own issued shape and doesn't also
// loosen what a user types by hand — a purely numeric, hyphenated value like
// "1234-5678-9012-34" is still exactly the malformed-Fayda-ID case this
// field's format check exists to catch.
const ISSUED_FAYDA_ID_PATTERN = /^(?=.{3,60}$)(?=.*[A-Za-z])[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;
const REGISTRATION_PATTERN = /^(?=.{3,60}$)[A-Za-z0-9]+(?:[-/][A-Za-z0-9]+)*$/;

/**
 * Exported so ReviewAndSubmitCard.tsx's masked-display logic checks the same
 * field set this module validates as a Fayda ID, rather than keeping its own
 * copy that could drift from this one.
 */
export const ID_FIELD_KEYS = ["faydaId", "representativeFaydaId", "officialFaydaId"];

/**
 * Why a non-empty value is wrong, in two phrasings: `hint` for the
 * "Field (hint)" summary lists, `message` for the sentence under the field.
 * The one place these rules live, so the summary and the inline message can't
 * disagree about what's valid.
 *
 * `dialCode` is the phone box's own country selection (`values.phoneCode`) —
 * only the phoneNumber check needs it, see `isValidPhoneNumber` in phone.ts
 * for why Ethiopia gets a real rule and every other country only a loose one.
 */
function formatProblemFor(key: string, value: string, dialCode: string | undefined): { hint: string; message: string } | null {
  if (ID_FIELD_KEYS.includes(key) && !FAYDA_PATTERN.test(value) && !ISSUED_FAYDA_ID_PATTERN.test(value)) {
    return {
      hint: "must be exactly 16 digits",
      message: "Enter a valid Fayda ID: exactly 16 digits.",
    };
  }
  if (key === "registrationNumber" && !REGISTRATION_PATTERN.test(value)) {
    return {
      hint: "3-60 letters/numbers, hyphens or slashes allowed between",
      message: "Use 3-60 letters or numbers; hyphens or slashes are allowed between them.",
    };
  }
  if (key === "email" && !EMAIL_PATTERN.test(value)) {
    return {
      hint: "not a valid email address",
      message: "Enter a valid email address, e.g. name@example.com.",
    };
  }
  if (key === "phoneNumber" && !isValidPhoneNumber(value, dialCode)) {
    return isEthiopianDialCode(dialCode ?? "+251")
      ? {
          hint: "Ethiopian mobile, e.g. 0912345678 or 912345678",
          message: "Enter a valid Ethiopian mobile number, e.g. 0912345678 or 912345678 (starts with 09, 07, 9, or 7).",
        }
      : {
          hint: "not a valid phone number for the selected country",
          message: "Enter a valid phone number for the selected country.",
        };
  }
  return null;
}

/**
 * Labels of fields whose *value* (not presence — see `getMissingRequiredFields`
 * for that) doesn't match what the backend will eventually require, paired
 * with why. Only checks fields that have a value; an empty optional field is
 * `getMissingRequiredFields`'s concern, not this one's.
 */
export function getFieldFormatErrors(
  submitterType: string,
  values: Record<string, string>,
  hiddenFields: readonly string[] = []
): string[] {
  const errors: string[] = [];
  for (const field of SI_FIELDS_BY_TYPE[submitterType] ?? []) {
    if (hiddenFields.includes(field.key)) continue;
    const value = values[field.key]?.trim();
    if (!value) continue;

    const problem = formatProblemFor(field.key, value, values.phoneCode);
    if (problem) errors.push(`${field.label} (${problem.hint})`);
  }
  return errors;
}

export const DEFAULT_REQUIRED_MESSAGE = "This field is required.";

/**
 * The message for one identity field, or null if it's fine: missing when
 * required, otherwise malformed. `requiredMessage` is passed in so a caller
 * that has translations can supply its own wording.
 */
export function getFieldError(
  submitterType: string,
  key: string,
  values: Record<string, string>,
  hiddenFields: readonly string[] = [],
  requiredMessage: string = DEFAULT_REQUIRED_MESSAGE
): string | null {
  const field = (SI_FIELDS_BY_TYPE[submitterType] ?? []).find((f) => f.key === key);
  if (!field || hiddenFields.includes(key)) return null;

  const value = values[key]?.trim();
  if (!value) return field.required ? requiredMessage : null;
  return formatProblemFor(key, value, values.phoneCode)?.message ?? null;
}

/** Every failing identity field, keyed by field key, in the type's form order. */
export function getFieldErrors(
  submitterType: string,
  values: Record<string, string>,
  hiddenFields: readonly string[] = [],
  requiredMessage: string = DEFAULT_REQUIRED_MESSAGE
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of SI_FIELDS_BY_TYPE[submitterType] ?? []) {
    const message = getFieldError(submitterType, field.key, values, hiddenFields, requiredMessage);
    if (message) errors[field.key] = message;
  }
  return errors;
}
