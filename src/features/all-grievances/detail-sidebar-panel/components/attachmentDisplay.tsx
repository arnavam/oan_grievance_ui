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
 * Download is held back until `/view?download=1` has been checked against the
 * backend: it is the same streaming endpoint preview already uses, so it is
 * expected to work, but it has not been verified end to end. One exported
 * string so `AttachmentsList` and `DocumentViewerPopup` show identical wording
 * rather than two guesses at the same explanation.
 */
export const ATTACHMENT_BYTES_UNAVAILABLE_REASON =
  "Not available yet — file downloads are being verified with the backend.";

/**
 * Flip this once `/view?download=1` is verified — a single point to re-enable
 * Download, rather than deleting/re-adding the disabled prop by hand.
 * `DocumentViewerPopup`'s download handler is already wired to the real API
 * calls behind this flag, so flipping it is the only change needed.
 */
export const ATTACHMENT_DOWNLOAD_DISABLED = true;
