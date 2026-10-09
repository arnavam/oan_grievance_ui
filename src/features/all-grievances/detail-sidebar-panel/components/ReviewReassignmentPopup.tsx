"use client";

import { useState } from 'react';
import { RefreshCw, X, CheckCircle2, AlertTriangle, AlertCircle, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChangeRequestData } from '../../types';
import { formatDate } from '../../utils/mapGrievance';

interface ReviewReassignmentPopupProps {
  request: ChangeRequestData;
  onClose: () => void;
  onDecide: (decision: 'Approved' | 'Rejected', note: string) => Promise<unknown>;
  readOnly?: boolean;
}

export function ReviewReassignmentPopup({
  request,
  onClose,
  onDecide,
  readOnly,
}: ReviewReassignmentPopupProps) {
  const t = useTranslations('reviewPopups');
  const [isOpen, setIsOpen] = useState(true);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 300);
  };

  const isRejectingValid = comments.trim().length >= 20;

  const handleDecide = async (decision: 'Approved' | 'Rejected') => {
    if (decision === 'Rejected' && !isRejectingValid) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await onDecide(decision, comments.trim());
      handleClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : typeof err === 'string' ? err : t('failedSubmit');
      setErrorMsg(msg);
      setIsSubmitting(false);
    }
  };

  const changeItem = request.changes?.find((c) => c.fieldname === 'department');
  const oldDepartment = changeItem?.old_value || 'Unknown';
  const newDepartment = changeItem?.new_value || 'Unknown';

  const requestedAt = formatDate(request.requested_at) || 'N/A';
  const officerRole = t('officerRole');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 transform ${
          isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-600" />
              <h2 className="text-md font-bold text-gray-900">{t('reassignmentTitle')}</h2>
            </div>
            <p className="text-sm text-gray-500">{t(readOnly ? 'requestedByRole' : 'reviewingRequestFrom', { role: officerRole })}</p>
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
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg font-medium">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Reason */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-700">{t('justification')}</label>
            <div className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-700 bg-gray-50">
              {request.reason || t('noJustification')}
            </div>
            <div className="text-[11px] text-gray-400">{t('submittedAt', { date: requestedAt })}</div>
          </div>

          {/* Department Change */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-700">{t('requestedChange')}</label>
            <div className="w-full border border-gray-200 rounded-lg p-3 py-2.5 flex flex-col gap-2 text-sm text-gray-700 bg-gray-50">
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-500 w-24">{t('department')}:</span>
                <span className="line-through text-gray-400">{oldDepartment}</span>
                <span className="text-gray-400">→</span>
                <span className="font-semibold text-gray-900">{newDepartment}</span>
              </div>
              
              {request.changes?.some(c => c.fieldname === 'assigned_to' || c.fieldname === 'target_officer') && (
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-500 w-24">{t('officer')}:</span>
                  <span className="line-through text-gray-400">
                    {request.changes.find(c => c.fieldname === 'assigned_to' || c.fieldname === 'target_officer')?.old_value || t('unassigned')}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="font-semibold text-gray-900">
                    {request.changes.find(c => c.fieldname === 'assigned_to' || c.fieldname === 'target_officer')?.new_value || t('unassigned')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Requested By */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-700">{t('requestedBy')}</label>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="w-8 h-8 rounded-full bg-blue-800 text-white flex items-center justify-center text-xs font-bold shrink-0">
                GO
              </div>
              <div className="flex flex-col">
                <div className="text-sm text-gray-700">
                  {officerRole}
                </div>
              </div>
            </div>
          </div>

          {/* Comments */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-700">
              {t('yourComments')} <span className="text-gray-400 font-normal">{t('requiredRejecting')}</span>
            </label>
            <textarea
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="e.g. Approved, reassignment is appropriate. Or, if rejecting: explain why it should stay in the current department..."
              className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white resize-none"
            />
            <div className="text-[11px] text-gray-400">{t('optionalApproving')}</div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200/60 text-sm text-amber-800">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
            <p className="leading-relaxed">
              {t('auditWarning')}
            </p>
          </div>
        </div>

        {/* Footer */}
        {!readOnly && (
          <div className="p-5 border-t border-gray-100 bg-white flex justify-center gap-4">
            <button
              type="button"
              onClick={() => handleDecide('Rejected')}
              disabled={!isRejectingValid || isSubmitting}
              className="flex-1 py-2.5 bg-white border border-red-500 text-red-600 font-bold rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <XCircle className="h-4 w-4" /> {t('reject')}
            </button>
            <button
              type="button"
              onClick={() => handleDecide('Approved')}
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-[#1E9E49] hover:bg-[#18803B] text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" /> {t('approve')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
