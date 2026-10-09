"use client";

import { useEffect, useId, useMemo, useState } from 'react';
import { User, Save, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
// eslint-disable-next-line boundaries/dependencies
import { useGrievanceOptions } from '@/features/metadata/hooks/useMetadata';
import { AnimatedSelect } from '@/components/submitter-identity/SI-Dropdown';
import { ReviewReassignmentPopup } from './ReviewReassignmentPopup';
import type { GrievanceChangeResponseData, GrievanceTimelineData, ReassignGrievancePayload } from '../../types';

interface CaseManagementProps {
  canManageCase: boolean;
  ticketNumber?: string | null;
  timelineData?: GrievanceTimelineData | null;
  onReassign?: (payload: ReassignGrievancePayload) => Promise<unknown>;
  onDecideReassignment?: (name: string, decision: 'Approved' | 'Rejected', comments: string) => Promise<void>;
}

export function CaseManagement({
  canManageCase,
  ticketNumber,
  timelineData,
  onReassign,
  onDecideReassignment,
}: CaseManagementProps) {
  const activeTicket = ticketNumber || timelineData?.ticket_number || '';
  const optionsData = useAppSelector((state) => state.metadata?.grievanceOptions);
  const departmentSelectId = useId();
  const officerSelectId = useId();

  const [department, setDepartment] = useState<string>('');
  const [targetOfficer, setTargetOfficer] = useState<string>('');
  const [reassignReason, setReassignReason] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [showViewPopup, setShowViewPopup] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const initialDepartment = timelineData?.assignment?.department || '';
  const initialOfficer = timelineData?.assignment?.assigned_to || '';
  const activeReassignment = timelineData?.assignment?.active_reassignment_request;
  const user = useAppSelector((state) => state.auth?.user);
  const isApprover = !!activeReassignment && activeReassignment.pending_with === user?.email;

  // Re-sync only when the ticket or its server-side department actually
  // changes. Keying on the whole timelineData object reset the form on every
  // timeline refetch (status change, comment, the refetch after a reassign),
  // wiping a half-typed justification.
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setDepartment(initialDepartment);
    setReassignReason('');
  }, [activeTicket, initialDepartment]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (department !== initialDepartment) {
      setTargetOfficer('');
    } else {
      setTargetOfficer(initialOfficer);
    }
  }, [department, initialDepartment, initialOfficer]);

  const { data: deptOptions, isLoading: isLoadingOfficers } = useGrievanceOptions(
    { department },
    { skip: !department }
  );

  const departmentOptions = useMemo(() => {
    return (optionsData?.departments ?? [])
      .map((d) => d.department_name)
      .filter(Boolean)
      .map((name) => ({ value: name, label: name }));
  }, [optionsData]);

  const officerOptions = useMemo(() => {
    return (deptOptions?.officers || []).map((o) => ({
      value: o.user_id,
      label: o.full_name,
    }));
  }, [deptOptions]);

  if (!canManageCase && !isApprover) return null;

  const isReassignment =
    (department && department !== initialDepartment) || (targetOfficer !== initialOfficer);

  const handleSave = async () => {
    if (!onReassign || !activeTicket) return;
    setIsSaving(true);
    setFeedback(null);

    try {
      if (isReassignment) {
        const result = (await onReassign({
          target_department: department,
          target_officer: targetOfficer || undefined,
          reason: reassignReason.trim() || undefined,
        })) as GrievanceChangeResponseData | undefined;

        const isPending = result?.change_request?.status === 'Pending';
        const msg = isPending
          ? 'Reassignment request submitted (pending supervisor approval)'
          : `Case reassigned to ${department}`;

        setFeedback({ type: 'success', message: msg });
        setReassignReason('');
        // A pending request leaves the server department unchanged, so the
        // effect above won't fire — reset the dropdown here instead of
        // leaving the form armed to resubmit the same request.
        if (isPending) setDepartment(initialDepartment);
      } else {
        setFeedback({ type: 'success', message: 'No department changes to save' });
      }
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to request reassignment';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#F1F3F4] shadow-sm overflow-hidden flex flex-col">
      {/* Header spanning full width */}
      <div className="flex items-center gap-3 p-5 border-b border-gray-200 bg-white">
        <User className="h-6 w-6 text-blue-700 fill-blue-700" />
        <h3 className="text-md font-bold text-[#141F2B]">Case Management</h3>
      </div>

      {/* Content Area */}
      <div className="p-5 flex flex-col gap-4">
        {feedback && (
          <div
            className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {activeReassignment && (
          <div className="flex flex-col gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg mb-2">
            <div className="flex items-center gap-2 text-blue-800 text-sm font-semibold">
              <RefreshCw className="h-4 w-4" />
              Reassignment Pending
            </div>
            <p className="text-xs text-blue-700">
              A request to reassign to {activeReassignment.changes?.find(c => c.fieldname === 'department')?.new_value || 'another department'} is pending.
            </p>
            <button
              onClick={() => setShowViewPopup(true)}
              className="mt-1 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md transition-colors cursor-pointer"
            >
              {isApprover ? 'Review Request' : 'View Request'}
            </button>
          </div>
        )}

        {canManageCase && (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={departmentSelectId} className="text-[13px] font-semibold text-[#1B362D]">
                Department
              </label>
              <AnimatedSelect
                id={departmentSelectId}
                placeholder="Select Department"
                value={department}
                onChange={setDepartment}
                options={departmentOptions}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={officerSelectId} className="text-[13px] font-semibold text-[#1B362D]">
                Officer (Optional)
              </label>
              <AnimatedSelect
                id={officerSelectId}
                placeholder={isLoadingOfficers ? "Loading officers..." : "Select Officer"}
                value={targetOfficer}
                onChange={setTargetOfficer}
                options={officerOptions}
                disabled={isLoadingOfficers || !department}
              />
            </div>

            {/* Reason for Reassignment (visible when department is modified) */}
            {isReassignment && (
              <div className="flex flex-col gap-1.5 p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <RefreshCw className="h-3.5 w-3.5 text-amber-700" />
                  <span>Reassignment Justification</span>
                </div>
                <p className="text-[11px] text-amber-700 leading-tight">
                  Junior officer reassignment requests will be routed to your supervisor for review.
                </p>
                <textarea
                  rows={2}
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  placeholder="Provide justification for routing to this department..."
                  className="w-full mt-1 border border-amber-200 rounded-md p-2 text-xs text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                />
              </div>
            )}

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="w-full py-2.5 bg-[#1E9E49] hover:bg-[#18803B] text-white font-bold text-sm rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-xs mt-1 cursor-pointer disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? 'Saving…' : isReassignment ? 'Submit Reassignment Request' : 'Save Changes'}
            </button>
          </>
        )}
      </div>

      {showViewPopup && activeReassignment && (
        <ReviewReassignmentPopup
          request={activeReassignment}
          onClose={() => setShowViewPopup(false)}
          onDecide={
            isApprover && onDecideReassignment
              ? (decision, comments) => onDecideReassignment(activeReassignment.name, decision, comments)
              : async () => {} // If readonly, we don't need a real onDecide, but wait ReviewReassignmentPopup requires it
          }
        />
      )}
    </div>
  );
}
