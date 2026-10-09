"use client";

import { useState } from 'react';
import { SidebarHeader } from './components/SidebarHeader';
import { CommentsAndCommunication } from './components/CommentsAndCommunication';
import { SLATracker } from './components/SLATracker';
import { CaseManagement } from './components/CaseManagement';
import { SubmitterDetails } from './components/SubmitterDetails';
import { ThreadSummary } from './components/ThreadSummary';
import { ResponseForm } from './components/ResponseForm';
import { AttachmentsList } from './components/AttachmentsList';
import { CaseActionsPanel } from './components/CaseActionsPanel';
import { useGrievanceTimeline } from '../hooks/useGrievanceTimeline';
import type { Grievance } from '../types';
import { useAppSelector } from '@/store/hooks';
import { uploadAttachments } from '@/lib/attachments';
import { isOfficerOrAdmin } from '@/features/auth/rbac';

export function GrievanceDetailSidebar({
  ticketNumber,
  grievance,
  onClose,
}: {
  ticketNumber?: string | null;
  grievance?: Grievance | null;
  onClose: () => void;
}) {
  const activeTicket = ticketNumber || grievance?.ticketNumber || grievance?.ticketId || null;
  const user = useAppSelector((state) => state.auth.user);
  const userRoles = user?.roles ?? [];
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load live timeline, conversation, and case state from Redux
  const {
    timelineData,
    isLoading,
    isSubmitting,
    error,
    refetch,
    addNote,
    executeAction,
    deferSLA,
    reassign,
  } = useGrievanceTimeline({
    ticketNumber: activeTicket,
  });

  const handleDecideDeferral = async (name: string, decision: string, note: string) => {
    const { decideChangeRequest } = await import('../api/grievanceApi');
    await decideChangeRequest(name, { decision, note });
    await refetch();
  };

  const handleDecideReassignment = async (name: string, decision: string, note: string) => {
    const { decideChangeRequest } = await import('../api/grievanceApi');
    await decideChangeRequest(name, { decision, note });
    await refetch();
  };

  const baseCanManageCase = isOfficerOrAdmin(userRoles);
  const isEscalated = timelineData?.escalated;
  const assignedToMe = timelineData?.assignment?.assigned_to === user?.email;
  const canManageCase = baseCanManageCase && (!isEscalated || assignedToMe);

  if (!activeTicket) return null;

  // An officer takes every action through the department response form
  // (action, then the response type mapped onto it). A submitter has no
  // response form, so their actions get the panel in its place.
  const availableActions = timelineData?.available_actions ?? [];
  const uploadFiles = (files: File[]) => uploadAttachments({ files, grievance: activeTicket });

  return (
    <>
      <div
        className={`fixed inset-0 bg-gray-900/20 z-40 transition-opacity duration-300 ${
          activeTicket ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed inset-y-0 right-0 max-w-[100vw] bg-[#F8F9FA] shadow-2xl z-50 transform transition-all duration-300 ease-in-out flex flex-col ${
          isFullscreen ? 'w-full' : 'w-[1100px]'
        } ${activeTicket ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <SidebarHeader
          ticketNumber={activeTicket}
          timelineData={timelineData}
          grievance={grievance}
          onClose={onClose}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        />

        <div className="flex-1 overflow-y-auto p-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
          <div className="grid grid-cols-3 gap-6">
            {/* Left Column: Comments, Activity Timeline & Response Form */}
            <div className="col-span-2 flex flex-col gap-6">
              <CommentsAndCommunication
                canManageCase={canManageCase}
                timelineData={timelineData}
                isLoading={isLoading}
                error={error}
                onRetry={refetch}
                grievance={grievance}
              />
              <ResponseForm
                ticketNumber={activeTicket}
                canManageCase={canManageCase}
                actions={availableActions}
                isLoadingActions={!timelineData}
                onExecuteAction={executeAction}
                onAddNote={addNote}
                onUploadFiles={uploadFiles}
                isSubmitting={isSubmitting}
              />
              {timelineData && !canManageCase ? (
                <CaseActionsPanel
                  key={activeTicket}
                  actions={availableActions}
                  caseStatus={timelineData.status ?? timelineData.current_status}
                  isSubmitting={isSubmitting}
                  onExecute={executeAction}
                  onUploadFiles={uploadFiles}
                />
              ) : null}
            </div>

            {/* Right Column: SLA, Case Management, Submitter, Summary & Attachments */}
            <div className="col-span-1 flex flex-col gap-6">
              {grievance ? (
                <SLATracker
                  canManageCase={canManageCase}
                  grievance={grievance}
                  timelineData={timelineData}
                  onDefer={deferSLA}
                  onDecideDeferral={handleDecideDeferral}
                />
              ) : null}
              <CaseManagement
                canManageCase={canManageCase}
                ticketNumber={activeTicket}
                timelineData={timelineData}
                onReassign={reassign}
                onDecideReassignment={handleDecideReassignment}
              />

              {grievance ? (
                <SubmitterDetails grievance={grievance} timelineData={timelineData} />
              ) : null}
              <ThreadSummary canManageCase={canManageCase} timelineData={timelineData} />
              <AttachmentsList
                attachments={timelineData?.attachments}
                isLoading={isLoading}
                error={error}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
