import { FileText, List, Plus } from "lucide-react";
import Link from "next/link";
import type { SubmitGrievanceResult } from "../api/submitGrievanceApi";

interface GrievanceSubmittedCardProps {
  /** What the backend returned for the case just filed. */
  result: SubmitGrievanceResult;
  onReset?: () => void;
  ticketNumber?: string | null;
}

/**
 * The backend's `sla_due_date` is a naive "YYYY-MM-DD HH:MM:SS" string. Only
 * the date is shown: the time would need a time zone this response doesn't
 * carry, and a wrong hour is worse than none.
 */
export function formatSlaDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value.replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function GrievanceSubmittedCard({
  result,
  onReset,
  ticketNumber: propsTicketNumber,
}: GrievanceSubmittedCardProps) {
  const ticketNumber = result.ticket_number || propsTicketNumber || "";
  const respondBy = formatSlaDate(result.sla_due_date);
  const similar = result.possible_duplicates ?? [];
  return (
    <div
      className="bg-white rounded-xl shadow-sm flex flex-col overflow-hidden border border-[#F1F3F4] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 animate-slide-up"
      style={{ minHeight: "calc(100vh - 140px)" }}
    >
      {/* Top Header */}
      <div className="p-6 pb-4 border-b border-gray-200 flex items-start gap-4 bg-white z-10">
        <div className="w-12 h-12 rounded-xl bg-[#078930]/10 flex items-center justify-center border border-[#078930]/20 flex-shrink-0">
          <FileText className="w-6 h-6 text-[#0b8535]" />
        </div>
        <div>
          <h3 className="text-[17px] font-bold text-gray-900">
            Grievance Submitted
          </h3>
          <p className="text-sm text-gray-500 mt-0">
            Your grievance has been registered. Acknowledgement sent via
            SMS/email.
          </p>
        </div>
      </div>

      {/* Centered Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center pb-12">
        {/* Animated Checkmark Circle */}
        <div className="mb-8 relative flex items-center justify-center">
          {/* Ping effect behind */}
          <div className="absolute inset-0 bg-green-300 rounded-full animate-ping-soft opacity-30"></div>
          {/* Main circle */}
          <div className="relative w-20 h-20 bg-[#DCFCE7] rounded-full flex items-center justify-center shadow-sm z-10 animate-pop">
            {/* Custom SVG Checkmark for drawing animation */}
            <svg
              className="w-10 h-10 text-[#16A34A]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path className="animate-check" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h2 className="text-[24px] font-bold text-gray-900 mb-3 animate-slide-up delay-200">
          Grievance Submitted
        </h2>
        <p className="text-gray-500 max-w-[340px] mb-8 text-[15px] leading-relaxed animate-slide-up delay-300">
          {result.duplicate_submission
            ? "This grievance had already been submitted — here is its ticket."
            : "Your grievance has been registered. Acknowledgement sent via SMS/email."}
        </p>

        {/* Ticket Number Box */}
        <div className="bg-[#F1F5F9] rounded-xl p-5 mb-5 min-w-[340px] border border-gray-100 animate-slide-up delay-400 shadow-inner">
          <p className="text-[11px] font-semibold text-gray-400 tracking-widest mb-1.5 uppercase">
            Ticket Number
          </p>
          <p className="text-2xl font-bold text-gray-900 tracking-wide">
            {ticketNumber}
          </p>
        </div>

        {(result.status || respondBy || result.assigned_department) && (
          <dl className="mb-5 grid gap-x-8 gap-y-1 text-sm text-gray-600 animate-slide-up delay-400 sm:grid-cols-[auto_auto]">
            {result.status && (
              <>
                <dt className="font-semibold text-gray-500">Status</dt>
                <dd className="text-left font-medium text-gray-900">
                  {result.status}
                </dd>
              </>
            )}
            {respondBy && (
              <>
                <dt className="font-semibold text-gray-500">
                  Expected response by
                </dt>
                <dd className="text-left font-medium text-gray-900">
                  {respondBy}
                </dd>
              </>
            )}
            {result.assigned_department && (
              <>
                <dt className="font-semibold text-gray-500">Assigned to</dt>
                <dd className="text-left font-medium text-gray-900">
                  {result.assigned_department}
                </dd>
              </>
            )}
          </dl>
        )}

        {similar.length > 0 && (
          <p
            role="status"
            className="mb-5 max-w-[420px] rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-800 animate-slide-up delay-400"
          >
            You filed{" "}
            {similar.length === 1
              ? "a similar grievance"
              : `${similar.length} similar grievances`}{" "}
            recently ({similar.join(", ")}). This one was still registered, and
            the team will review them together.
          </p>
        )}

        <p className="text-sm text-gray-400 font-medium animate-slide-up delay-500 mb-10">
          Keep this number for tracking. You will be notified of all updates.
        </p>

        <Link
          href="/all-grievances"
          className="mt-4 flex items-center gap-2 text-[15px] font-semibold text-[#0b8535] hover:underline animate-slide-up delay-500"
        >
          <List className="w-4 h-4" />
          View my grievances
        </Link>

        <button
          onClick={onReset}
          className="mt-4 flex items-center gap-2 px-6 py-3 bg-[#16A34A] text-white rounded-lg text-[15px] font-bold hover:bg-[#10883c] transition-all duration-200 shadow-[0_4px_12px_rgba(22,163,74,0.3)] hover:shadow-[0_6px_16px_rgba(22,163,74,0.4)] animate-slide-up delay-500 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#16A34A]/50"
        >
          <Plus className="w-5 h-5" />
          Submit Another Grievance
        </button>
      </div>
    </div>
  );
}
