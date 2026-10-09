import { fetchApi } from '@/lib/api/fetchApi';
import { formatToE164 } from '@/lib/validation/phone';

// A draft is a Grievance document itself (workflow_state="Draft"), not a
// separate doctype with a JSON payload blob — oan_grievance_service's
// `Grievance Draft` doctype was removed; see api/v1/draft.py's SaveDraftRequest
// (`model_config = {"extra": "forbid"}` — it rejects any field this shape
// doesn't list, so this must match the backend's flat fields exactly).

export interface AdministrativeHierarchy {
  region?: string;
  region_id?: string;
  zone?: string;
  zone_id?: string;
  woreda?: string;
  woreda_id?: string;
  kebele?: string;
  kebele_id?: string;
}

/** One upload against a draft, as `GET /api/v1/drafts` reports it — a Grievance Attachment row. */
export interface DraftAttachment {
  name: string;
  file_name: string;
  file_url: string;
  size_bytes: number | null;
  mime_type: string | null;
  scan_status: string;
  creation: string;
}

export interface DraftState {
  name: string;
  ticket_number: string | null;
  client_submission_uuid: string;
  client_uuid?: string;
  status: string;
  workflow_state: string;
  submission_channel: string | null;
  submitter_type: string | null;
  submitter_name: string | null;
  contact_mobile: string | null;
  country_code?: string | null;
  phone_number?: string | null;
  contact_email: string | null;
  administrative_area: string | null;
  /** Region/zone/woreda/kebele names + ids for `administrative_area`, resolved server-side. */
  administrative_hierarchy: AdministrativeHierarchy | null;
  /** Comma-separated display string built from `administrative_hierarchy`, leaf to root. */
  location: string | null;
  administrative_unit: string | null;
  service_category: string | null;
  grievance_type: string | null;
  associated_service_provider: string | null;
  description: string | null;
  desired_outcome: string | null;
  is_anonymous: number;
  attachments: DraftAttachment[];
  attachment_count: number;
  owner: string | null;
}

export interface SaveDraftPayload {
  client_submission_uuid: string;
  submission_channel?: string;
  submitter_type?: string;
  submitter_name?: string;
  contact_mobile?: string;
  country_code?: string;
  phone_number?: string;
  contact_email?: string;
  /** An area's `area_id` or `path_code` — never a display name (the wizard holds areas as `AreaRef`s). */
  administrative_area?: string;
  administrative_unit?: string;
  service_category?: string;
  grievance_type?: string;
  associated_service_provider?: string;
  description?: string;
  desired_outcome?: string;
  is_anonymous?: number;
}

export interface SubmitDraftPayload extends Omit<SaveDraftPayload, 'client_submission_uuid'> {
  client_submission_uuid: string;
  consent_given: number;
  anonymity_justification?: string;
}

export interface SubmitDraftResult {
  ticket_number: string;
  status: string;
  workflow_state: string;
  client_submission_uuid: string;
  routing_rule: string | null;
}

/**
 * Drops only `undefined`/`null` — an empty string is kept and sent as-is.
 * The backend only updates a field it actually receives in the request body
 * (`if field is not None: doc.field = field`), so a field the caller means
 * to actively clear (kebele removed, desired outcome deleted, ...) has to
 * arrive as `""`, not be missing — omitting it would leave an earlier save's
 * stale value in place instead of clearing it.
 */
function cleanedBody(body: object): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined || value === null) continue;
    clean[key] = value;
  }
  if (typeof clean.contact_mobile === 'string' && clean.contact_mobile && !clean.contact_mobile.startsWith('+')) {
    clean.contact_mobile = formatToE164(clean.contact_mobile, typeof clean.country_code === 'string' ? clean.country_code : '+251');
  }
  return clean;
}

/** POST /api/v1/drafts — create or update the draft for `payload.client_submission_uuid`. */
export async function saveDraft(payload: SaveDraftPayload): Promise<DraftState> {
  return fetchApi<DraftState>('api/v1/drafts', {
    method: 'POST',
    body: JSON.stringify(cleanedBody(payload)),
  });
}

/**
 * POST /api/v1/drafts/submit — submit an existing draft into an active case.
 * `consent_given` is required by the backend (it 400s without it); every
 * other field just overwrites whatever the draft already has saved.
 */
export async function submitDraft(payload: SubmitDraftPayload): Promise<SubmitDraftResult> {
  return fetchApi<SubmitDraftResult>('api/v1/drafts/submit', {
    method: 'POST',
    body: JSON.stringify(cleanedBody(payload)),
  });
}

/**
 * GET /api/v1/drafts — the authenticated caller's latest unsubmitted draft,
 * looked up by session owner (no client_submission_uuid needed). Rejects with
 * an ApiError(404) when there is none — the ordinary case for a fresh wizard.
 */
export async function loadDraft(): Promise<DraftState> {
  return fetchApi<DraftState>('api/v1/drafts', { method: 'GET' });
}

/** DELETE /api/v1/drafts?client_submission_uuid=... — discard a draft the submitter abandoned. */
export async function discardDraft(clientSubmissionUuid: string): Promise<void> {
  await fetchApi(`api/v1/drafts?client_submission_uuid=${encodeURIComponent(clientSubmissionUuid)}`, {
    method: 'DELETE',
  });
}
