import { submitsOnBehalfOfOthers } from "@/components/submitter-identity/fields";
import { formatToE164 } from "@/lib/validation/phone";
import type { SaveDraftPayload } from "@/lib/drafts";

/**
 * `submitter_name`/`contact_mobile`/`contact_email` never reach the backend
 * any other way for a Cooperative/NGO/Woreda-Kebele/Development-Agent
 * submission: RegisterForm.tsx's Profile step only persists those fields to
 * `localStorage` (see `saveSubmitterProfile`), never to the backend, so the
 * signed-in account's own session has no way to know a representative's name
 * or a cooperative's contact details. They must be sent explicitly here.
 */
export interface WizardIdentitySource {
  /** The wizard's own slug (e.g. "development_agent"), not a display label — only used to gate the account-profile fallback below. */
  submitterType?: string;
  identityValues: Record<string, string>;
  userFullName?: string | null;
  userMobile?: string | null;
  userEmail?: string | null;
}

/**
 * Field keys per submitter type — see fields.ts's `SI_FIELDS_BY_TYPE`:
 * `fullName` (Individual Farmer), `representativeName` (Cooperative/FPO and
 * NGO both), `officeName` (Woreda/Kebele Body), `farmerName` (Development
 * Agent — the farmer they're filing on behalf of, the actual submitter of
 * record).
 *
 * The account-profile fallback (`userFullName`/`userMobile`/`userEmail`) is
 * skipped for a Development Agent specifically: that type's own identity is
 * never collected (see `submitsOnBehalfOfOthers`), so if the farmer's own
 * fields are still empty — Step 1's "Save Draft" is deliberately unvalidated,
 * unlike "Save & Continue" — falling back to the *agent's* signed-in profile
 * would misattribute the grievance to the agent instead of leaving it blank.
 */
export function resolveSubmitterName({ identityValues, userFullName, submitterType }: WizardIdentitySource): string {
  const ownProfileFallback = submitsOnBehalfOfOthers(submitterType ?? "") ? "" : userFullName || "";
  return (
    identityValues.fullName ||
    identityValues.representativeName ||
    identityValues.officeName ||
    identityValues.farmerName ||
    ownProfileFallback
  );
}

export function resolveContactMobile({ identityValues, userMobile, submitterType }: WizardIdentitySource): string {
  const ownProfileFallback = submitsOnBehalfOfOthers(submitterType ?? "") ? "" : userMobile || "";
  const raw = identityValues.phoneNumber || ownProfileFallback;
  if (!raw) return "";
  return formatToE164(raw, identityValues.phoneCode || "+251");
}

export function resolveContactEmail({ identityValues, userEmail, submitterType }: WizardIdentitySource): string {
  const ownProfileFallback = submitsOnBehalfOfOthers(submitterType ?? "") ? "" : userEmail || "";
  return identityValues.email || ownProfileFallback;
}

export interface BuildSaveDraftPayloadInput extends WizardIdentitySource {
  clientSubmissionUuid: string;
  /** Display label, e.g. "Web Portal" — not the wizard's internal slug. */
  submissionChannelLabel?: string;
  /** Display label, e.g. "Individual Farmer" — not the wizard's internal slug. */
  submitterTypeLabel?: string;
  /** `area_id` of the selected kebele, else the woreda — never a display name. Omitted (not sent as "") when neither is selected yet, so saving an early step can't wipe a previously-saved value. */
  administrativeAreaId?: string;
  kebele?: string;
  /** Display label, e.g. "Inputs" — not the wizard's internal slug. */
  serviceCategoryLabel?: string;
  /**
   * `grievance_type_id` (e.g. "GTYPE-00001"), not the type's display name —
   * see `selectGrievanceTypeOptions`'s own doc comment. Unlike submission
   * channel/submitter type/service category, Grievance Type autonames on a
   * generated id, not its own name field, so the Link field this becomes
   * needs the id.
   */
  grievanceType?: string;
  associatedServiceProvider?: string;
  description?: string;
  desiredOutcome?: string;
}

/**
 * Shapes the wizard's state into `POST /api/v1/drafts`'s body — a flat
 * Grievance-document field set (`SaveDraftRequest`, `extra: "forbid"` on the
 * backend, so an unrecognized key 400s rather than being silently ignored).
 *
 * Every field below `client_submission_uuid` is sent as its current value —
 * blank or not — rather than omitted when empty: the backend only updates a
 * field it actually receives (`if field is not None: doc.field = field`), so
 * omitting a field a user just cleared (kebele removed, desired outcome
 * deleted, ...) would leave the stale value from an earlier save in place
 * instead of clearing it. `administrative_area` is the one exception — see
 * its own doc comment above.
 */
export function buildSaveDraftPayload(input: BuildSaveDraftPayloadInput): SaveDraftPayload {
  return {
    client_submission_uuid: input.clientSubmissionUuid,
    submission_channel: input.submissionChannelLabel ?? "",
    submitter_type: input.submitterTypeLabel ?? "",
    submitter_name: resolveSubmitterName(input),
    contact_mobile: resolveContactMobile(input),
    country_code: input.identityValues.phoneCode || "+251",
    phone_number: input.identityValues.phoneNumber || "",
    contact_email: resolveContactEmail(input),
    administrative_area: input.administrativeAreaId || undefined,
    administrative_unit: input.kebele?.trim() ?? "",
    service_category: input.serviceCategoryLabel ?? "",
    grievance_type: input.grievanceType ?? "",
    associated_service_provider: input.associatedServiceProvider?.trim() ?? "",
    description: input.description?.trim() ?? "",
    desired_outcome: input.desiredOutcome?.trim() ?? "",
  };
}
