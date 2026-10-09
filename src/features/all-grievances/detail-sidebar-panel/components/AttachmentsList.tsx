"use client";

import { useMemo, useState, type ReactElement } from "react";
import { Paperclip, Loader2, AlertTriangle, FileText } from "lucide-react";
import { SCAN_STATUS, type AttachmentRow, type ScanStatus } from "@/lib/attachments";
import type { GrievanceTimelineAttachment } from "../../types";
import { formatAttachmentSize, scanStatusBadge } from "./attachmentDisplay";
import { DocumentViewerPopup } from "./DocumentViewerPopup";

export interface AttachmentsListProps {
  /** Attachments already provided by the grievance timeline API response. */
  attachments?: (GrievanceTimelineAttachment | AttachmentRow)[] | null;
  isLoading?: boolean;
  error?: string | null;
}

/**
 * Case attachments list rendered in the grievance detail sidebar.
 * Consumes the attachments array returned directly from the timeline API,
 * avoiding a redundant secondary network request.
 */
export function AttachmentsList({
  attachments,
  isLoading = false,
  error = null,
}: AttachmentsListProps): ReactElement {
  const [selectedAttachment, setSelectedAttachment] = useState<AttachmentRow | null>(null);

  const rows: AttachmentRow[] = useMemo(() => {
    if (!attachments) return [];
    return attachments.map((att) => {
      if ("size_bytes" in att && typeof att.size_bytes === "number") {
        return att as AttachmentRow;
      }
      const tAtt = att as GrievanceTimelineAttachment;
      return {
        name: tAtt.name || tAtt.id || "",
        file_name: tAtt.file_name || tAtt.name || "attachment",
        mime_type: tAtt.mime_type || "application/octet-stream",
        size_bytes: tAtt.file_size ?? 0,
        document_type: tAtt.document_type ?? null,
        response: null,
        scan_status: (tAtt.scan_status as ScanStatus) || (SCAN_STATUS.PENDING as ScanStatus),
        scanned_at: null,
        uploaded_by_user: tAtt.uploaded_by_user ?? null,
        uploaded_by_submitter: tAtt.uploaded_by_submitter ?? null,
        creation: tAtt.creation || "",
      };
    });
  }, [attachments]);

  return (
    <div className="bg-white rounded-xl border border-[#F1F3F4] shadow-sm overflow-hidden flex flex-col">
      <div className="flex items-center gap-3 p-5 border-b border-gray-200 bg-white">
        <div className="w-6 flex justify-center">
          <Paperclip className="h-5 w-5 text-indigo-600" strokeWidth={2.5} />
        </div>
        <h3 className="text-xl font-bold text-[#141F2B]">Attachments</h3>
      </div>

      <div className="px-5 py-3">
        {isLoading && (
          <div role="status" className="flex items-center gap-2 py-4 text-gray-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading attachments…
          </div>
        )}

        {!isLoading && error && (
          <div role="alert" className="flex items-center gap-2 py-4 text-red-600 text-sm">
            <AlertTriangle className="w-4 h-4" />
            Could not load attachments for this case.
          </div>
        )}

        {!isLoading && !error && rows.length === 0 && (
          <p role="status" className="py-4 text-sm text-gray-500">No attachments on this case.</p>
        )}

        {!isLoading &&
          !error &&
          rows.map((row) => (
            <button
              key={row.name}
              type="button"
              onClick={() => setSelectedAttachment(row)}
              className="w-full flex items-center gap-3 py-3 border-b border-gray-100 last:border-b-0 text-left hover:bg-gray-50 rounded-lg transition-colors -mx-2 px-2"
            >
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{row.file_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500">{formatAttachmentSize(row.size_bytes)}</span>
                  {scanStatusBadge(row)}
                </div>
              </div>
            </button>
          ))}
      </div>

      {selectedAttachment && (
        <DocumentViewerPopup
          attachment={selectedAttachment}
          onClose={() => setSelectedAttachment(null)}
        />
      )}
    </div>
  );
}
