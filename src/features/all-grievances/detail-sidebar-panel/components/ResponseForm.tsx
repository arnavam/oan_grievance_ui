"use client";

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { fetchResponseTemplates } from '../../api/grievanceApi';
import type {
  GrievanceActionPayload,
  GrievanceAvailableAction,
  ResponseTemplateItem,
} from '../../types';
import { composeResponseBody, splitResponseParts } from '@/lib/responseBody';
import { SupportingDocumentsField } from './SupportingDocumentsField';
import {
  FileText,
  AlertCircle,
  ChevronDown,
  EyeOff,
  Send,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface DropdownOption {
  value: string;
  label: string;
}

const ACTION_TAKEN_MAX = 500;

const AnimatedDropdown = ({
  label,
  options,
  placeholder,
  required,
  disabled,
  value,
  onChange,
}: {
  label: string;
  options: DropdownOption[];
  placeholder: string;
  required?: boolean;
  disabled?: boolean;
  value: string;
  onChange: (val: string) => void;
}) => {
  const selected = options.find((opt) => opt.value === value);

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative flex flex-col flex-1" ref={dropdownRef}>
      <label className="block text-sm font-bold text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border rounded-lg px-3 py-2.5 text-sm flex justify-between items-center transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500 border-gray-300 bg-white disabled:bg-gray-50 disabled:cursor-not-allowed"
      >
        <span className={`truncate ${selected ? 'text-gray-900' : 'text-gray-400'}`}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        className={`absolute top-[72px] left-0 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden transition-all duration-300 origin-top transform ${
          isOpen ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-h-48 overflow-y-auto">
          {options.map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 transition-colors border-b border-gray-50 last:border-0 ${
                value === opt.value ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

interface ResponseFormProps {
  ticketNumber: string;
  canManageCase: boolean;
  /**
   * The case's `available_actions`, each carrying the response types mapped
   * onto it. Comes with the timeline, so it follows the case's state.
   */
  actions: GrievanceAvailableAction[];
  /** True until the timeline (and so the action list) has loaded. */
  isLoadingActions: boolean;
  onExecuteAction?: (payload: GrievanceActionPayload) => Promise<unknown>;
  onAddNote?: (note: string, isInternal: boolean) => Promise<unknown>;
  /** Uploads supporting documents to the case before the response is sent. */
  onUploadFiles?: (files: File[]) => Promise<unknown>;
  isSubmitting?: boolean;
}

export function ResponseForm({
  ticketNumber,
  canManageCase,
  actions,
  isLoadingActions,
  onExecuteAction,
  onAddNote,
  onUploadFiles,
  isSubmitting: isExecuting = false,
}: ResponseFormProps) {
  const t = useTranslations('responseForm');
  const tDocs = useTranslations('supportingDocuments');
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const isSubmitting = isExecuting || isUploading;
  const [activeTab, setActiveTab] = useState<'response' | 'internal'>('response');

  const [action, setAction] = useState('');
  const [template, setTemplate] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [internalNotesResponse, setInternalNotesResponse] = useState('');

  const [internalNoteTab, setInternalNoteTab] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Tagged with the action it was fetched for, so loading state is
  // derived (no synchronous setState in the effect) and stale responses are ignored.
  const [templates, setTemplates] = useState<{
    action: string;
    items: ResponseTemplateItem[];
  } | null>(null);

  // The case can move on (here or from another tab) while something is
  // picked; an action or type no longer offered is treated as no selection.
  const selectedAction = actions.find((item) => item.action === action) ?? null;

  useEffect(() => {
    if (!canManageCase || !action) return;
    const controller = new AbortController();
    fetchResponseTemplates(ticketNumber, action, { signal: controller.signal })
      .then((data) => setTemplates({ action: action, items: data?.items ?? [] }))
      .catch(() => {
        if (!controller.signal.aborted) setTemplates({ action: action, items: [] });
      });
    return () => controller.abort();
  }, [ticketNumber, action, canManageCase]);

  const actionOptions = actions.map((item) => ({ value: item.action, label: item.label }));

  const templateItems = selectedAction && templates?.action === selectedAction.action ? templates.items : [];
  const isLoadingTemplates = selectedAction !== null && templates?.action !== selectedAction.action;
  const templateOptions = templateItems.map((item) => ({
    value: item.template,
    label: item.title,
  }));

  const handleActionChange = (value: string) => {
    if (value === action) return;
    setAction(value);
    setTemplate('');
  };

  // A template is authored in the same two parts the officer fills, and the
  // service returns them split. One not written in two parts fills the
  // summary, since the summary is what the submitter reads.
  const handleTemplateChange = (value: string) => {
    const selected = templateItems.find((item) => item.template === value);
    if (!selected) return;
    const parts = selected.reason_parts ?? splitResponseParts(selected.reason);
    setTemplate(value);
    setActionTaken((parts.action_taken || '').slice(0, ACTION_TAKEN_MAX));
    setResolutionSummary(parts.resolution_summary || selected.reason);
  };

  const getErrorMessage = (err: unknown, fallback: string) =>
    err instanceof Error && err.message ? err.message : fallback;

  const switchTab = (tab: 'response' | 'internal') => {
    setActiveTab(tab);
    setSubmitError(null);
    setSubmitSuccess(null);
  };

  let actionPlaceholder = t('selectAction');
  if (isLoadingActions) actionPlaceholder = t('loadingActions');
  else if (actionOptions.length === 0) actionPlaceholder = t('noActions');

  let templatePlaceholder = t('selectTemplate');
  if (!selectedAction) templatePlaceholder = t('selectActionFirst');
  else if (isLoadingTemplates) templatePlaceholder = t('loadingTemplates');
  else if (templateOptions.length === 0) templatePlaceholder = t('noTemplates');

  const isResponseValid =
    selectedAction !== null &&
    actionTaken.trim() !== '' &&
    resolutionSummary.trim() !== '';
  const isInternalValid = internalNoteTab.trim() !== '';

  if (!canManageCase) return null;

  const handleSubmitResponse = async () => {
    if (!isResponseValid || !selectedAction || !onExecuteAction) return;
    setSubmitError(null);
    setSubmitSuccess(null);

    // Upload first so the documents are on the case when the response lands.
    if (files.length > 0 && onUploadFiles) {
      setIsUploading(true);
      try {
        await onUploadFiles(files);
        setFiles([]);
      } catch (err) {
        setSubmitError(getErrorMessage(err, tDocs('uploadFailed')));
        return;
      } finally {
        setIsUploading(false);
      }
    }

    try {
      // Sent as two parts composed under standard headings as the reason.
      await onExecuteAction({
        action: selectedAction.action,
        template: template || null,
        reason: composeResponseBody({ actionTaken, resolutionSummary }),
        internal_notes: internalNotesResponse.trim() || null,
      });
      setAction('');
      setTemplate('');
      setActionTaken('');
      setResolutionSummary('');
      setInternalNotesResponse('');
      setSubmitSuccess(t('responseSubmitted', { type: selectedAction.label }));
      setTimeout(() => setSubmitSuccess(null), 4000);
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'Failed to post response'));
    }
  };

  const handleSubmitInternalNote = async () => {
    if (!isInternalValid || !onAddNote) return;
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      await onAddNote(internalNoteTab.trim(), true);
      setInternalNoteTab('');
      setSubmitSuccess('Internal note added successfully');
      setTimeout(() => setSubmitSuccess(null), 4000);
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'Failed to add internal note'));
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1">
      <div className="flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => switchTab('response')}
          className={`flex-1 py-4 px-6 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'response'
              ? 'text-emerald-700 bg-emerald-50/50 border-b-2 border-emerald-500'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <FileText className="h-4 w-4" /> Dept Response (Appendix D)
        </button>
        <button
          type="button"
          onClick={() => switchTab('internal')}
          className={`flex-1 py-4 px-6 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'internal'
              ? 'text-emerald-700 bg-emerald-50/50 border-b-2 border-emerald-500'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <AlertCircle className="h-4 w-4" /> Internal Note
        </button>
      </div>

      <div className="p-6 flex flex-col gap-5 flex-1">
        {submitSuccess && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{submitSuccess}</span>
          </div>
        )}

        {submitError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg font-medium">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {activeTab === 'response' ? (
          <>
            <div className="flex gap-4 z-50">
              <AnimatedDropdown
                label="Response Type"
                placeholder={actionPlaceholder}
                options={actionOptions}
                required
                disabled={isLoadingActions || actionOptions.length === 0}
                value={selectedAction ? action : ''}
                onChange={handleActionChange}
              />
              <AnimatedDropdown
                label="Response Template"
                placeholder={templatePlaceholder}
                options={templateOptions}
                disabled={isLoadingTemplates || templateOptions.length === 0}
                value={template}
                onChange={handleTemplateChange}
              />
            </div>
            <div className="z-10 relative">
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                Action Taken <span className="text-red-500">*</span>{' '}
                <span className="text-gray-400 font-normal">({actionTaken.length}/{ACTION_TAKEN_MAX})</span>
              </label>
              <textarea
                rows={3}
                maxLength={ACTION_TAKEN_MAX}
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                placeholder="Describe the specific action taken by the department..."
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white resize-none"
              ></textarea>
            </div>
            <div className="z-10 relative">
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                Resolution Summary <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={resolutionSummary}
                onChange={(e) => setResolutionSummary(e.target.value)}
                placeholder="Summarize the outcome for the submitter..."
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white resize-none"
              ></textarea>
            </div>
            {onUploadFiles && (
              <SupportingDocumentsField
                files={files}
                onChange={(next) => {
                  setFiles(next);
                  setSubmitError(null);
                }}
                onRejected={() => setSubmitError(tDocs('rejected'))}
                disabled={isSubmitting}
              />
            )}
            <div className="z-10 relative">
              <label className="block text-sm font-bold text-[#203628] mb-1.5 flex items-center gap-1.5">
                <EyeOff className="h-4 w-4 text-gray-500" /> Internal Notes{' '}
                <span className="text-gray-400 font-normal">(not visible to submitter)</span>
              </label>
              <textarea
                rows={3}
                value={internalNotesResponse}
                onChange={(e) => setInternalNotesResponse(e.target.value)}
                placeholder="Process gaps, follow-up actions, escalation reasons..."
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-[#fff] resize-none"
              ></textarea>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={!isResponseValid || isSubmitting}
                onClick={handleSubmitResponse}
                className={`flex items-center gap-2 px-5 py-2.5 text-white font-bold rounded-lg transition-all shadow-sm text-sm ${
                  isResponseValid && !isSubmitting
                    ? 'bg-[#1ca848] hover:bg-[#1a9c42] cursor-pointer transform hover:scale-[1.02]'
                    : 'bg-[#66C38A] opacity-60 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {isSubmitting ? 'Submitting…' : 'Submit Response'}
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col flex-1">
            <label className="block text-sm font-bold text-[#203628] mb-1.5 flex items-center gap-1.5">
              <EyeOff className="h-4 w-4 text-gray-500" />
              <span>Internal Notes</span>
              <span className="text-gray-400 font-normal">(not visible to submitter)</span>
            </label>
            <textarea
              rows={4}
              value={internalNoteTab}
              onChange={(e) => setInternalNoteTab(e.target.value)}
              placeholder="Add an internal case note visible only to officers..."
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm text-gray-900 focus:outline-none focus:border-[#EFA771] focus:ring-1 focus:ring-[#EFA771] bg-[#fff] resize-none"
            ></textarea>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                disabled={!isInternalValid || isSubmitting}
                onClick={handleSubmitInternalNote}
                className={`flex items-center gap-2 px-5 py-2.5 text-white font-bold rounded-lg transition-all shadow-sm text-sm ${
                  isInternalValid && !isSubmitting
                    ? 'bg-[#ECA974] hover:bg-[#DE9D68] cursor-pointer transform hover:scale-[1.02]'
                    : 'bg-[#ECA974] opacity-60 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {isSubmitting ? 'Adding…' : 'Add Note'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
