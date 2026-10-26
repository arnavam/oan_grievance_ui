import { fetchApi } from '@/lib/api/fetchApi';
import { ApiError } from '@/lib/api/fetchApi';

// Client for oan_grievance_service's attachment REST routes — supporting-
// document upload, listing, download, and deletion for a grievance. See the backend module's own docstring for the security model
// (type sniffed from bytes, EXIF stripped, withheld until scanned clean);
// this module only carries requests to it, it doesn't re-implement any of
// that.

// fetchApi's 15s default is sized for JSON calls. A multipart file upload
// (up to the backend's documented 10MB limit) can legitimately take longer
// than that on a slow connection — this app targets Ethiopia OpenAgriNet,
// not a fast/reliable link — so uploads get a longer allowance instead of
// aborting a request the backend would otherwise have accepted.
const UPLOAD_TIMEOUT_MS = 60_000;

/**
 * Mirrors the backend's Grievance Attachment `scan_status` field exactly
 * (SCAN_PENDING/SCAN_CLEAN in grievance_attachment.py) — a shared constant
 * instead of the "Clean"/"Infected" literals this codebase used to repeat
 * across three files, so a future casing change on the backend is a type
 * error here instead of silently disabling every scan-status check that
 * compared against the old spelling.
 */
export const SCAN_STATUS = {
  PENDING: 'Pending',
  CLEAN: 'Clean',
  INFECTED: 'Infected',
  /**
   * Fail-closed result when the scanner itself couldn't be reached or errored
   * (`scanning.py`'s `SCAN_FAILED` — a self-hosted ClamAV sidecar that's down
   * or unconfigured, not a verdict about the file). Same as Infected from this
   * app's side: `is_servable()` on the backend only ever passes on Clean, so a
   * Failed file is just as unusable as evidence and needs the same "remove
   * and retry" treatment, not a message implying the file itself is suspect.
   */
  FAILED: 'Failed',
} as const;

export type ScanStatus = (typeof SCAN_STATUS)[keyof typeof SCAN_STATUS];

/** Mirrors the backend's `MAX_ATTACHMENTS_PER_CASE` (attachment.py) — a case may carry at most this many files. */
export const MAX_ATTACHMENTS_PER_CASE = 10;

/** Mirrors the backend's 10MB per-file upload limit (attachment.py). */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_ATTACHMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export const ACCEPTED_ATTACHMENT_EXTENSIONS = '.pdf,.jpg,.jpeg,.png';

/**
 * One row in the submission wizard's attachment list — a file picked in this
 * session and held in memory. Nothing reaches the backend until the
 * grievance is filed; `ReviewAndSubmitCard` uploads the staged files to the
 * new ticket right after `POST /api/v1/grievances` succeeds. `key` is a
 * stable client-side id for React lists.
 */
export interface WizardAttachment {
  key: string;
  file: File;
  fileName: string;
  /** Set on the recording made in the wizard's voice recorder — it stands in for the typed description. */
  kind?: "voice";
}

/**
 * A row from `GET /api/v1/grievances/<id>/attachments` — exactly the field
 * list `get_attachments`'s `frappe.get_all(..., fields=[...])` selects on the
 * backend, no more. In particular there's no `servable`/similar boolean here:
 * `is_servable()` (Clean-only) is enforced server-side, on `download` and on
 * read permission for the row itself — a Clean check has to be done here by
 * comparing `scan_status` against `SCAN_STATUS.CLEAN`, not by trusting an
 * extra field the list endpoint doesn't actually send.
 */
export interface AttachmentRow {
  name: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  document_type: string | null;
  response: string | null;
  scan_status: ScanStatus;
  scanned_at: string | null;
  uploaded_by_user: string | null;
  uploaded_by_submitter: string | null;
  creation: string;
}

export interface UploadAttachmentResult {
  attachment: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  checksum_sha256: string;
  /** Always Pending fresh off upload. */
  scan_status: ScanStatus;
}

/**
 * Uploads to a filed case — `POST /api/v1/grievances/<grievance>/attachments`
 * (see `submit_documents` on the backend,
 * `oan_grievance_service/api/v1/attachment.py`).
 *
 * `files` may hold more than one file — the backend accepts several under
 * repeated `file` fields in one multipart request (`get_uploaded_files`),
 * validates and stores them together, and always responds with one result
 * per file, in the same order. Capped server-side at
 * `MAX_ATTACHMENTS_PER_CASE` per case.
 */
export async function uploadAttachments(params: {
  files: File[];
  grievance: string;
  documentType?: string;
  response?: string;
}): Promise<UploadAttachmentResult[]> {
  const form = new FormData();
  for (const file of params.files) {
    form.append('file', file);
  }
  if (params.documentType) form.append('document_type', params.documentType);
  if (params.response) form.append('response', params.response);
  form.append('grievance', params.grievance);

  const rawResult = await fetchApi<UploadAttachmentResult | UploadAttachmentResult[]>(
    `v1/grievances/${encodeURIComponent(params.grievance)}/attachments`,
    { method: 'POST', body: form },
    UPLOAD_TIMEOUT_MS
  );

  return Array.isArray(rawResult) ? rawResult : [rawResult];
}

/** GET /api/v1/grievances/<grievance>/attachments — every attachment on a case, including pending/infected ones. */
export async function getAttachments(grievance: string): Promise<AttachmentRow[]> {
  return fetchApi<AttachmentRow[]>(`v1/grievances/${grievance}/attachments`, { method: 'GET' });
}

/** DELETE /api/v1/attachments/<attachment> — only while the case is still open. */
export async function deleteAttachment(attachment: string): Promise<void> {
  await fetchApi(`v1/attachments/${attachment}`, { method: 'DELETE' });
}

/**
 * Returns the authenticated proxy URL to stream an attachment's bytes inline or as download.
 * Backend route: GET /api/v1/attachments/<id>/view(?download=1)
 */
export function getAttachmentViewUrl(attachment: string, download = false): string {
  const enc = encodeURIComponent(attachment);
  return `/api/proxy/v1/attachments/${enc}/view${download ? '?download=1' : ''}`;
}

/**
 * Fetches an attachment's bytes through the auth proxy and returns an object
 * URL for download or inline preview.
 */
export async function fetchAttachmentBlobUrl(attachment: string, download = true): Promise<string> {
  const response = await fetch(getAttachmentViewUrl(attachment, download));
  if (!response.ok) {
    throw new ApiError('Failed to download the file.', null, response.status);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
