"use client";

import { useMemo } from 'react';
import { Link, FileText, EyeOff, Paperclip, MessageSquare } from 'lucide-react';
import type { GrievanceTimelineData, TimelineEntry, TimelineEventItem } from '../../types';

interface ThreadSummaryProps {
  canManageCase: boolean;
  timelineData?: GrievanceTimelineData | null;
}

type RawTimelineItem = TimelineEntry | TimelineEventItem;

function getEntryType(item: RawTimelineItem): string {
  if ('entry_type' in item && typeof item.entry_type === 'string') {
    return item.entry_type;
  }
  if ('event_type' in item && typeof item.event_type === 'string') {
    return item.event_type;
  }
  return '';
}

function isInternal(item: RawTimelineItem): boolean {
  return Boolean(item.is_internal);
}

export function ThreadSummary({ canManageCase, timelineData }: ThreadSummaryProps) {
  const canSeeInternal = canManageCase;

  const counts = useMemo(() => {
    const rawItems: RawTimelineItem[] = timelineData?.timeline || timelineData?.events || [];

    const deptResponses = rawItems.filter((e) => {
      const type = getEntryType(e).toLowerCase();
      return type === 'response' || type.includes('dept');
    }).length;

    const internalNotes = rawItems.filter(isInternal).length;

    const publicMessages = rawItems.filter((e) => {
      const isInt = isInternal(e);
      const type = getEntryType(e).toLowerCase();
      return !isInt && (type === 'message' || type === 'info_response');
    }).length;

    const attachmentsCount =
      timelineData?.attachments?.length ??
      rawItems.filter((e) => getEntryType(e).toLowerCase() === 'attachment').length;

    return {
      deptResponses,
      internalNotes,
      publicMessages,
      attachmentsCount,
    };
  }, [timelineData]);

  return (
    <div className="bg-white rounded-xl border border-[#F1F3F4] shadow-sm overflow-hidden flex flex-col">
      {/* Header spanning full width */}
      <div className="flex items-center gap-3 p-5 border-b border-gray-200 bg-white">
        <div className="w-6 flex justify-center">
          <Link className="h-6 w-6 text-indigo-700" strokeWidth={2.5} />
        </div>
        <h3 className="text-xl font-bold text-[#141F2B]">Thread Summary</h3>
      </div>

      {/* Content Area */}
      <div className="px-5 py-3 flex flex-col">
        <div className="flex flex-col">
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div className="flex items-center gap-4 text-[16px] text-[#475467]">
              <div className="p-2.5 bg-orange-50 text-[#E85D04] rounded-xl">
                <FileText className="h-4 w-4" />
              </div>
              Dept responses
            </div>
            <span className="px-3 py-1 bg-[#F1F3F4] text-[#475467] text-[15px] font-bold rounded-full">
              {counts.deptResponses}
            </span>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div className="flex items-center gap-4 text-[16px] text-[#475467]">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <MessageSquare className="h-4 w-4" />
              </div>
              Public messages
            </div>
            <span className="px-3 py-1 bg-[#F1F3F4] text-[#475467] text-[15px] font-bold rounded-full">
              {counts.publicMessages}
            </span>
          </div>

          {canSeeInternal && (
            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div className="flex items-center gap-4 text-[16px] text-[#475467]">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                  <EyeOff className="h-4 w-4" />
                </div>
                Internal notes
              </div>
              <span className="px-3 py-1 bg-[#F1F3F4] text-[#475467] text-[15px] font-bold rounded-full">
                {counts.internalNotes}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-4 text-[16px] text-[#475467]">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <Paperclip className="h-4 w-4" />
              </div>
              Attachments
            </div>
            <span className="px-3 py-1 bg-[#F1F3F4] text-[#475467] text-[14px] font-bold rounded-full">
              {counts.attachmentsCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
