import { useState, useEffect } from 'react';
import { X, CalendarClock, AlertTriangle, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { DeferSLAPayload, GrievanceChangeResponseData } from '../../types';

interface DeferSLAPopupProps {
  /** Bound to the active ticket by `useGrievanceTimeline().deferSLA`, same as CaseManagement's `onReassign`. */
  onDefer: (payload: DeferSLAPayload) => Promise<GrievanceChangeResponseData | undefined>;
  onClose: () => void;
  onSuccess?: (result: GrievanceChangeResponseData) => void;
}

export function DeferSLAPopup({ onDefer, onClose, onSuccess }: DeferSLAPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [days, setDays] = useState('7');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOpen(true);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 300);
  };

  const parsedDays = parseInt(days, 10);
  const isDaysValid = !isNaN(parsedDays) && parsedDays >= 1 && parsedDays <= 30;
  const isReasonValid = reason.trim().length >= 20;
  const isFormValid = isDaysValid && isReasonValid && !isSubmitting;

  const handleSubmit = async () => {
    if (!isFormValid) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const result = await onDefer({
        additional_days: parsedDays,
        reason: reason.trim(),
      });
      if (!result) return;

      const status = result?.change_request?.status || 'Pending';
      const msg =
        status === 'Approved'
          ? `SLA deadline extended by ${parsedDays} days.`
          : `SLA deferral request for ${parsedDays} days submitted (pending L2 approval).`;

      setSuccessMsg(msg);
      onSuccess?.(result);

      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Failed to request SLA deferral';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 transform ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-indigo-600" />
              <h2 className="text-md font-bold text-gray-900">Defer SLA</h2>
            </div>
            <p className="text-sm text-gray-500">Requires supervisor approval</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors focus:outline-none cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-5 overflow-y-auto max-h-[70vh]">
          {/* Feedback Messages */}
          {successMsg && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg font-medium">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Reason */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-700">Reason for Deferral * <span className="text-gray-400 font-normal">(min. 20 characters)</span></label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe why the SLA requires extension — e.g. awaiting lab results, pending inter-agency coordination, seasonal factor..."
              className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-gray-50/50 resize-none"
            />
            <div className={`text-[11px] font-bold ${reason.trim().length < 20 ? 'text-amber-500' : 'text-emerald-500'}`}>
              {reason.trim().length} / 20 minimum characters
            </div>
          </div>

          {/* Days */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-700">Defer by (additional days) *</label>
            <input
              type="number"
              min={1}
              max={30}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-gray-50/50"
            />
            <div className="text-[11px] text-gray-500">
              Maximum 30 additional days. Subject to approver discretion.
            </div>
          </div>

          {/* Warning */}
          <div className="mt-2 flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200/60 text-sm text-amber-800">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
            <p className="leading-relaxed">
              Deferral requests are logged in the audit trail. The approver will be notified and must explicitly approve or reject the request. SLA clock continues until approval is granted.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 bg-white flex justify-center gap-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            className={`px-6 py-2.5 text-white font-bold rounded-lg flex items-center gap-2 transition-all shadow-sm ${
              isFormValid && !isSubmitting
                ? 'bg-[#1ca848] hover:bg-[#1a9c42] cursor-pointer'
                : 'bg-[#8ED1A1] cursor-not-allowed opacity-75'
            }`}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {isSubmitting ? 'Submitting…' : 'Submit for Approval'}
          </button>
        </div>
      </div>
    </div>
  );
}

