import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileText, ChevronDown, Pencil, Archive, RotateCcw } from 'lucide-react';
import { splitResponseParts } from '@/lib/responseBody';
import type { ResponseTemplate } from './types';

interface ResponseTemplateRowProps {
    template: ResponseTemplate;
    /** Display name for the template's department id. */
    departmentName: string | null;
    isLast?: boolean;
    isBusy?: boolean;
    /** False hides Edit/Retire/Reactivate — for a read-only role (Review Officer) the backend refuses the write anyway. */
    canManage?: boolean;
    onEdit: (template: ResponseTemplate) => void;
    onRetire: (template: ResponseTemplate) => void;
    onReactivate: (template: ResponseTemplate) => void;
}

const getStatusStyles = (action: string) => {
    switch (action) {
        case 'Resolve':
            return 'bg-[#E1F9E8] text-[#1A9F53] border-[#B7ECC9]';
        case 'Partially Resolve':
            return 'bg-[#E1F9E8] text-[#059669] border-[#A7F3D0]';
        case 'Submit Response':
            return 'bg-[#E1EDFF] text-[#2F65CB] border-[#C3DDFD]';
        case 'Request More Info':
            return 'bg-[#FFF3E5] text-[#D0621D] border-[#FBD6B7]';
        case 'Refer Onward':
            return 'bg-[#F3E8FF] text-[#7E22CE] border-[#E9D5FF]';
        case 'Reject':
            return 'bg-[#FFE5E5] text-[#D01D1D] border-[#FBB7B7]';
        default:
            return 'bg-gray-100 text-gray-700 border-gray-200';
    }
};

export function ResponseTemplateRow({
    template,
    departmentName,
    isLast,
    isBusy = false,
    canManage = true,
    onEdit,
    onRetire,
    onReactivate,
}: ResponseTemplateRowProps) {
    const t = useTranslations('admin.responseTemplates');
    const [isExpanded, setIsExpanded] = useState(false);
    // A template not written in two parts shows its whole body as the summary.
    const parts = template.reason_parts
        ? {
            action_taken: template.reason_parts.action_taken ?? '',
            resolution_summary: template.reason_parts.resolution_summary ?? template.body,
        }
        : splitResponseParts(template.body);
    const panelId = `template-${template.template}-details`;

    return (
        <div className={`bg-white rounded-xl overflow-hidden border border-gray-200 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:shadow-lg transition-all duration-300 ${template.is_active ? '' : 'opacity-70'} ${!isLast ? 'mb-4' : ''}`}>
            {/* Header Row */}
            <button
                type="button"
                aria-expanded={isExpanded}
                aria-controls={panelId}
                className="w-full p-5 flex items-center justify-between text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#16A34A]"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-[#078930]/10 border border-[#078930]/20 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-[#16A34A]" aria-hidden="true" />
                    </div>

                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[13px] font-medium text-gray-500">{template.template}</span>
                            <span className="text-[14px] font-semibold text-gray-900 truncate">{template.title}</span>
                        </div>
                        <div className="text-[13px] text-gray-500">
                            {template.service_category || t('allCategories')} • {departmentName ?? t('allDepartments')}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                    {!template.is_active && (
                        <span className="px-2.5 py-1 rounded-full text-[12px] font-semibold border bg-gray-100 text-gray-600 border-gray-300">
                            {t('retired')}
                        </span>
                    )}
                    <span className={`px-2.5 py-1 rounded-full text-[12px] font-semibold border ${getStatusStyles(template.action)}`}>
                        {template.action}
                    </span>
                    <div className="flex flex-col justify-center">
                        <span className="text-[11px] text-[#717182] font-medium leading-none mb-1">{t('used')}</span>
                        <span className="text-[14px] text-[#0A0A0A] font-semibold text-center leading-none">{template.usage_count}×</span>
                    </div>
                    <span className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500">
                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                    </span>
                </div>
            </button>

            {isExpanded && (
                <div id={panelId} className="border-t border-gray-100 bg-white">
                    <div className="p-6 px-8 bg-[#ECECF0]/30 border-t border-gray-200">
                        <div className="mb-6">
                            <h4 className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-1">{t('actionTaken')}</h4>
                            <p className="text-[14px] text-gray-800 leading-relaxed whitespace-pre-wrap">
                                {parts.action_taken || '—'}
                            </p>
                        </div>

                        <div>
                            <h4 className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-1">{t('resolutionSummary')}</h4>
                            <p className="text-[14px] text-gray-800 leading-relaxed whitespace-pre-wrap">
                                {parts.resolution_summary}
                            </p>
                        </div>
                    </div>

                    <div className="bg-white border-t border-gray-200 px-8 py-4 rounded-b-xl">
                        <div className="flex items-center justify-end gap-4">
                            <span className="text-[12px] text-gray-600 font-medium mr-auto">
                                {t('usedTimes', { count: template.usage_count })}
                            </span>

                            {canManage && (
                                <>
                                    {template.is_active ? (
                                        <button
                                            type="button"
                                            disabled={isBusy}
                                            onClick={() => onRetire(template)}
                                            className="px-5 py-3 border border-red-200 rounded-lg text-[14px] font-medium text-red-700 hover:bg-red-50 flex items-center gap-2 transition-colors disabled:opacity-50"
                                        >
                                            <Archive className="w-4 h-4" aria-hidden="true" />
                                            {t('retire')}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled={isBusy}
                                            onClick={() => onReactivate(template)}
                                            className="px-5 py-3 border border-gray-200 rounded-lg text-[14px] font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors disabled:opacity-50"
                                        >
                                            <RotateCcw className="w-4 h-4" aria-hidden="true" />
                                            {t('reactivate')}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => onEdit(template)}
                                        className="px-5 py-3 bg-[#16A34A] text-white rounded-lg text-[14px] font-bold hover:bg-[#15803d] flex items-center gap-2 transition-colors disabled:opacity-50"
                                    >
                                        <Pencil className="w-4 h-4" aria-hidden="true" />
                                        {t('edit')}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
