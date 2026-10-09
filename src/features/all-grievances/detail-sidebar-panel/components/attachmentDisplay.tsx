import type { ReactNode } from "react";
import { SCAN_STATUS, type AttachmentRow } from "@/lib/attachments";

/** Shared by `AttachmentsList` and `DocumentViewerPopup` so the two can't drift on what "2.4 MB" means. */
export function formatAttachmentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function scanStatusBadge(row: Pick<AttachmentRow, "scan_status">): ReactNode {
  if (row.scan_status === SCAN_STATUS.CLEAN) {
    return <span className="text-[11px] font-semibold text-[#16A34A] bg-green-50 px-2 py-0.5 rounded-full">Clean</span>;
  }
  if (row.scan_status === SCAN_STATUS.INFECTED) {
    return <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Infected</span>;
  }
  if (row.scan_status === SCAN_STATUS.FAILED) {
    return <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Scan failed</span>;
  }
  return <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Scanning…</span>;
}

/**
 * `fetchAttachmentBlobUrl` always 401s right now — a documented backend gap
 * (see its own doc comment in `@/lib/attachments`): `file_url` points at
 * Frappe's `/private/files/*`, which this app's JWT auth can't reach. Preview
 * and download both need those bytes, so both stay disabled with this same
 * reason until a backend fix (a whitelisted streaming endpoint) lands. One
 * exported string so `AttachmentsList` and `DocumentViewerPopup` show
 * identical wording rather than two guesses at the same explanation.
 */
export const ATTACHMENT_BYTES_UNAVAILABLE_REASON =
  "Not available yet — a backend gap blocks file downloads through this app's login for now.";

/**
 * Flip this once `fetchAttachmentBlobUrl`'s 401 gap is actually fixed
 * server-side — a single point to re-enable Download, rather than deleting/
 * re-adding the disabled prop by hand. `DocumentViewerPopup`'s download
 * handler is already wired to the real API calls behind this flag, so
 * flipping it is the only change needed.
 */
export const ATTACHMENT_DOWNLOAD_DISABLED = true;
