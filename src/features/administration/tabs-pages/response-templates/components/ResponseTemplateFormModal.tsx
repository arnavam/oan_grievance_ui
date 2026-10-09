"use client";

import { useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { composeResponseBody, splitResponseParts } from '@/lib/responseBody';
import {
  TEMPLATE_VARIABLES,
  type CreateResponseTemplatePayload,
  type ResponseTemplate,
  type UpdateResponseTemplatePayload,
} from './types';

export interface SelectOption {
  value: string;
  label: string;
}

export interface ResponseTemplateFormModalProps {
  /** The template being edited; absent when adding one. */
  template?: ResponseTemplate | null;
  actions: SelectOption[];
  departments: SelectOption[];
  serviceCategories: SelectOption[];
  onCreate: (payload: CreateResponseTemplatePayload) => Promise<unknown>;
  onUpdate: (template: string, payload: UpdateResponseTemplatePayload) => Promise<unknown>;
  onClose: () => void;
}

const getInputClass = (hasError?: boolean) =>
  `w-full border rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none transition-colors disabled:bg-gray-50 disabled:text-gray-500 ${
    hasError
      ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
      : 'border-gray-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
  }`;

/**
 * Add or edit a response template. The service stores one Jinja `body`; it is
 * sent and read here as Action taken + Resolution summary, the same two parts
 * the officer's response form fills from it (see `@/lib/responseBody`).
 */
export function ResponseTemplateFormModal({
  template,
  actions,
  departments,
  serviceCategories,
  onCreate,
  onUpdate,
  onClose,
}: ResponseTemplateFormModalProps) {
  const t = useTranslations('admin.responseTemplates');
  const isEdit = !!template;
  const titleId = useId();
  const variablesId = useId();
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const actionRef = useRef<HTMLSelectElement>(null);
  const actionTakenRef = useRef<HTMLTextAreaElement>(null);
  const resolutionSummaryRef = useRef<HTMLTextAreaElement>(null);

  // A template not written in two parts opens with its whole body as the summary.
  const initialParts = template?.reason_parts
    ? {
        action_taken: template.reason_parts.action_taken ?? '',
        resolution_summary: template.reason_parts.resolution_summary ?? '',
      }
    : splitResponseParts(template?.body);
  const code = template?.template ?? '';
  const [title, setTitle] = useState(template?.title ?? '');
  const [action, setAction] = useState(template?.action ?? '');
  const [department, setDepartment] = useState(template?.department ?? '');
  const [serviceCategory, setServiceCategory] = useState(template?.service_category ?? '');
  const [actionTaken, setActionTaken] = useState(initialParts.action_taken);
  const [resolutionSummary, setResolutionSummary] = useState(initialParts.resolution_summary);
  const [isActive, setIsActive] = useState(template?.is_active ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    title?: string;
    action?: string;
    actionTaken?: string;
    resolutionSummary?: string;
  }>({});

  const isTwoPartAction = action === 'Resolve' || action === 'Partially Resolve' || action === 'Resolved';

  // Held in a ref so a parent passing an inline `onClose` doesn't re-run the
  // mount effect (and steal focus back to the first field) on every render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    firstFieldRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // A template's current type, department or category may since have been
  // deactivated and so be missing from the options; keep it selectable.
  const withCurrent = (options: SelectOption[], current: string) =>
    current && !options.some((o) => o.value === current) ? [...options, { value: current, label: current }] : options;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const templateSchema = z.object({
      title: z.string().trim().min(1, t('titleRequired')),
      action: z.string().min(1, t('actionRequired')),
      actionTaken: isTwoPartAction
        ? z.string().trim().min(1, t('actionTakenRequired'))
        : z.string().optional(),
      resolutionSummary: z.string().trim().min(1, t('resolutionSummaryRequired')),
    });

    const parsed = templateSchema.safeParse({
      title,
      action,
      actionTaken,
      resolutionSummary,
    });

    if (!parsed.success) {
      const errors: typeof fieldErrors = {};
      for (const issue of parsed.error.issues) {
        const fieldKey = issue.path[0] as keyof typeof fieldErrors;
        if (fieldKey && !errors[fieldKey]) {
          errors[fieldKey] = issue.message;
        }
      }
      setFieldErrors(errors);
      if (errors.title) firstFieldRef.current?.focus();
      else if (errors.action) actionRef.current?.focus();
      else if (errors.actionTaken) actionTakenRef.current?.focus();
      else if (errors.resolutionSummary) resolutionSummaryRef.current?.focus();
      return;
    }

    setFieldErrors({});
    setIsSaving(true);
    setError(null);
    const bodyText = actionTaken.trim()
      ? composeResponseBody({ action_taken: actionTaken, resolution_summary: resolutionSummary })
      : resolutionSummary.trim();
    const fields = {
      title: title.trim(),
      action: action,
      // An empty scope means "every department/category": null clears it on edit, omitted on create.
      department: department || null,
      service_category: serviceCategory || null,
      body: bodyText,
      is_active: isActive,
    };
    try {
      if (template) {
        await onUpdate(template.template, fields);
      } else {
        await onCreate({
          ...fields,
          department: fields.department ?? undefined,
          service_category: fields.service_category ?? undefined,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t('saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 id={titleId} className="text-lg font-bold text-gray-900">
            {isEdit ? t('editTitle') : t('addTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4" noValidate>
          {error && <ErrorAlert>{error}</ErrorAlert>}

          <div className="grid grid-cols-2 gap-4">
            {isEdit && (
              <Field label={t('code')} hint={t('codeFixed')}>
                {(id, describedBy) => (
                  <input
                    id={id}
                    aria-describedby={describedBy}
                    value={code}
                    disabled
                    className={getInputClass()}
                  />
                )}
              </Field>
            )}
            <Field label={t('titleLabel')} required error={fieldErrors.title}>
              {(id, describedBy) => (
                <input
                  id={id}
                  ref={firstFieldRef}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (fieldErrors.title) setFieldErrors((p) => ({ ...p, title: undefined }));
                  }}
                  aria-describedby={describedBy}
                  aria-invalid={!!fieldErrors.title}
                  className={getInputClass(!!fieldErrors.title)}
                />
              )}
            </Field>
            <Field label={t('action')} required error={fieldErrors.action}>
              {(id, describedBy) => (
                <select
                  id={id}
                  ref={actionRef}
                  value={action}
                  onChange={(e) => {
                    setAction(e.target.value);
                    if (fieldErrors.action) setFieldErrors((p) => ({ ...p, action: undefined }));
                  }}
                  aria-describedby={describedBy}
                  aria-invalid={!!fieldErrors.action}
                  className={getInputClass(!!fieldErrors.action)}
                >
                  <option value="">{t('selectAction')}</option>
                  {withCurrent(actions, action).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              )}
            </Field>
            <Field label={t('department')}>
              {(id) => (
                <select id={id} value={department} onChange={(e) => setDepartment(e.target.value)} className={getInputClass()}>
                  <option value="">{t('allDepartments')}</option>
                  {withCurrent(departments, department).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              )}
            </Field>
            <Field label={t('serviceCategory')}>
              {(id) => (
                <select id={id} value={serviceCategory} onChange={(e) => setServiceCategory(e.target.value)} className={getInputClass()}>
                  <option value="">{t('allCategories')}</option>
                  {withCurrent(serviceCategories, serviceCategory).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              )}
            </Field>
            <label className="flex items-center gap-2 self-end pb-2.5 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 accent-emerald-600"
              />
              {t('active')}
            </label>
          </div>

          <p id={variablesId} className="text-xs text-gray-600 bg-blue-50 border border-blue-100 rounded-lg p-3">
            {t('variablesHint')}{' '}
            {TEMPLATE_VARIABLES.map((v) => (
              <code key={v} className="mr-1.5 text-blue-700">{`{{ ${v} }}`}</code>
            ))}
          </p>

          <Field label={t('actionTaken')} required={isTwoPartAction} error={fieldErrors.actionTaken}>
            {(id, describedBy) => (
              <textarea
                id={id}
                ref={actionTakenRef}
                rows={4}
                value={actionTaken}
                onChange={(e) => {
                  setActionTaken(e.target.value);
                  if (fieldErrors.actionTaken) setFieldErrors((p) => ({ ...p, actionTaken: undefined }));
                }}
                aria-describedby={describedBy ?? variablesId}
                aria-invalid={!!fieldErrors.actionTaken}
                className={`${getInputClass(!!fieldErrors.actionTaken)} resize-y`}
              />
            )}
          </Field>
          <Field label={t('resolutionSummary')} required error={fieldErrors.resolutionSummary}>
            {(id, describedBy) => (
              <textarea
                id={id}
                ref={resolutionSummaryRef}
                rows={5}
                value={resolutionSummary}
                onChange={(e) => {
                  setResolutionSummary(e.target.value);
                  if (fieldErrors.resolutionSummary) setFieldErrors((p) => ({ ...p, resolutionSummary: undefined }));
                }}
                aria-describedby={describedBy ?? variablesId}
                aria-invalid={!!fieldErrors.resolutionSummary}
                className={`${getInputClass(!!fieldErrors.resolutionSummary)} resize-y`}
              />
            )}
          </Field>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {isEdit ? t('save') : t('add')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  required = false,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: (id: string, describedBy: string | undefined) => React.ReactNode;
}) {
  const id = useId();
  const hintId = useId();
  const errorId = useId();
  const describedBy = error ? errorId : hint ? hintId : undefined;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-bold text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500" aria-hidden="true">*</span>}
      </label>
      {children(id, describedBy)}
      {error && (
        <p id={errorId} className="mt-1 text-xs text-red-600 font-medium" role="alert">
          {error}
        </p>
      )}
      {!error && hint && <p id={hintId} className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}
