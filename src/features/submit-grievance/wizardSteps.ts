import { getFieldErrors } from "@/components/submitter-identity/fields";
import type { AreaRef } from "@/features/metadata";
import { MIN_DESCRIPTION_LENGTH } from "@/lib/validation/fieldRules";
import type { FieldErrors } from "@/lib/validation/useFieldErrors";

export type WizardStep = 1 | 2 | 3;

/** The required fields on Step 2, in form order. */
export type DetailsField = "serviceCategory" | "grievanceType" | "region" | "zone" | "woreda" | "description";

export interface DetailsFields {
  serviceCategory: string;
  grievanceType: string;
  region: AreaRef | null;
  zone: AreaRef | null;
  woreda: AreaRef | null;
  description: string;
}

export interface DetailsMessages {
  required: string;
  descriptionTooShort: (length: number) => string;
}

const DEFAULT_DETAILS_MESSAGES: DetailsMessages = {
  required: "This field is required.",
  descriptionTooShort: (length) => `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters (currently ${length}).`,
};

export function getDescriptionError(value: string, messages: DetailsMessages = DEFAULT_DETAILS_MESSAGES): string | null {
  const trimmed = value.trim();
  if (!trimmed) return messages.required;
  if (trimmed.length < MIN_DESCRIPTION_LENGTH) return messages.descriptionTooShort(trimmed.length);
  return null;
}

/** Step 2's field errors — what its Next button shows, and what `firstIncompleteStep` checks. */
export function getDetailsErrors(
  fields: DetailsFields,
  messages: DetailsMessages = DEFAULT_DETAILS_MESSAGES
): FieldErrors<DetailsField> {
  const errors: FieldErrors<DetailsField> = {};
  if (!fields.serviceCategory) errors.serviceCategory = messages.required;
  if (!fields.grievanceType) errors.grievanceType = messages.required;
  if (!fields.region) errors.region = messages.required;
  if (!fields.zone) errors.zone = messages.required;
  if (!fields.woreda) errors.woreda = messages.required;
  const descriptionError = getDescriptionError(fields.description, messages);
  if (descriptionError) errors.description = descriptionError;
  return errors;
}

export interface WizardFields extends DetailsFields {
  submitterType: string;
  submissionChannel: string;
  identityValues: Record<string, string>;
}

/**
 * The furthest step the wizard's current data allows: a step is reachable
 * only once every step before it is valid, by the same rules each step's own
 * Next button applies. The step in the URL is clamped to this, so opening
 * `?step=3` directly — or reloading it once the in-memory data is gone —
 * lands on the first step that still needs filling in.
 */
export function firstIncompleteStep(fields: WizardFields): WizardStep {
  const identityComplete =
    Boolean(fields.submitterType) &&
    Boolean(fields.submissionChannel) &&
    Object.keys(getFieldErrors(fields.submitterType, fields.identityValues)).length === 0;
  if (!identityComplete) return 1;
  if (Object.keys(getDetailsErrors(fields)).length > 0) return 2;
  return 3;
}
