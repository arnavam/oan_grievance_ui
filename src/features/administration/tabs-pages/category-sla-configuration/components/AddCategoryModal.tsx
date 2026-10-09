"use client";

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Field, FormShell, inputClass } from './FormShell';
import { fetchGrievanceTypes, MAX_PAGE_SIZE } from '../api/taxonomyApi';
import { describeSaveError } from './apiErrorMessage';
import { SuggestionInput } from './SuggestionInput';
import { suggestTicketCode } from './ticketCode';
import type { CreateServiceCategoryPayload } from './taxonomyTypes';

export interface AddCategoryModalProps {
  /** Ticket codes already in use, so the generated one avoids them. */
  takenCodes: readonly string[];
  /** Creates the category, then its first grievance type. */
  onCreate: (payload: CreateServiceCategoryPayload, firstType: string) => Promise<unknown>;
  onClose: () => void;
}

interface ToggleProps {
  label: string;
  stateLabel: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function Toggle({ label, stateLabel, checked, onChange }: ToggleProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <label className="flex items-center gap-2 cursor-pointer w-max">
        <span className="relative">
          <input
            type="checkbox"
            role="switch"
            className="sr-only peer"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="block w-9 h-5 rounded-full bg-gray-300 transition-colors peer-checked:bg-[#16A34A] peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-600 peer-focus-visible:ring-offset-2" />
          <span className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
        </span>
        <span className="text-xs text-gray-500">{stateLabel}</span>
      </label>
    </div>
  );
}

/**
 * Add Category, as designed: name, first grievance type, and the SLA fields.
 *
 * Only the name and the type reach the service. It also needs a ticket code,
 * which the design has no field for, so one is generated from the name. SLA
 * days and the two toggles have no API yet; they are kept in the form so the
 * layout matches, but are not sent.
 */
export function AddCategoryModal({ takenCodes, onCreate, onClose }: AddCategoryModalProps) {
  const t = useTranslations('admin.taxonomy');
  const nameRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [grievanceType, setGrievanceType] = useState('');
  const [slaDays, setSlaDays] = useState('');
  const [autoEscalate, setAutoEscalate] = useState(true);
  const [notifyOnSubmit, setNotifyOnSubmit] = useState(false);
  // Names of the grievance types that already exist, offered as suggestions. A type can't move
  // between categories, so choosing one creates a type of that name under the new category.
  const [typeSuggestions, setTypeSuggestions] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; grievanceType?: string; slaDays?: string }>({});

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchGrievanceTypes({ is_active: true, page_size: MAX_PAGE_SIZE }, { signal: controller.signal })
      .then((data) => {
        const names = (data?.grievance_types ?? []).map((type) => type.type_name);
        setTypeSuggestions([...new Set(names)].sort((a, b) => a.localeCompare(b)));
      })
      // Suggestions are a convenience; the field still takes any name typed in.
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const schema = z.object({
      name: z.string().trim().min(1, t('nameRequired')).max(140, t('nameTooLong')),
      grievanceType: z.string().trim().min(1, t('typeRequired')).max(140, t('nameTooLong')),
      slaDays: z
        .string()
        .trim()
        .refine((v) => v === '' || /^[1-9]\d*$/.test(v), t('slaDaysInvalid')),
    });
    const parsed = schema.safeParse({ name, grievanceType, slaDays });
    if (!parsed.success) {
      const errors: typeof fieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof typeof fieldErrors;
        if (key && !errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      if (errors.name) nameRef.current?.focus();
      else if (errors.grievanceType) typeRef.current?.focus();
      return;
    }

    const code = suggestTicketCode(parsed.data.name, takenCodes);
    if (!code) {
      setError(t('noCodeAvailable'));
      return;
    }

    setFieldErrors({});
    setIsSaving(true);
    setError(null);
    try {
      await onCreate({ category_name: parsed.data.name, code }, parsed.data.grievanceType);
      onClose();
    } catch (err) {
      setError(
        describeSaveError(err, {
          auth: t('authError'),
          forbidden: t('forbiddenError'),
          connection: t('connectionError'),
          fallback: t('saveFailed'),
        })
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <FormShell title={t('addCategoryTitle')} closeLabel={t('close')} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5" noValidate>
        {error && <ErrorAlert>{error}</ErrorAlert>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
          <Field label={t('categoryName')} required error={fieldErrors.name}>
            {(id, describedBy) => (
              <input
                id={id}
                ref={nameRef}
                value={name}
                placeholder={t('categoryNamePlaceholder')}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: undefined }));
                }}
                aria-describedby={describedBy}
                aria-invalid={!!fieldErrors.name}
                className={inputClass(!!fieldErrors.name)}
              />
            )}
          </Field>

          <Field label={t('grievanceTypeLabel')} required error={fieldErrors.grievanceType}>
            {(id, describedBy) => (
              <SuggestionInput
                id={id}
                inputRef={typeRef}
                value={grievanceType}
                suggestions={typeSuggestions}
                placeholder={t('grievanceTypePlaceholder')}
                invalid={!!fieldErrors.grievanceType}
                describedBy={describedBy}
                onChange={(next) => {
                  setGrievanceType(next);
                  if (fieldErrors.grievanceType) setFieldErrors((p) => ({ ...p, grievanceType: undefined }));
                }}
              />
            )}
          </Field>

          <Field label={t('slaDays')} error={fieldErrors.slaDays} hint={t('slaNotSaved')}>
            {(id, describedBy) => (
              <input
                id={id}
                inputMode="numeric"
                value={slaDays}
                placeholder={t('slaDaysPlaceholder')}
                onChange={(e) => {
                  setSlaDays(e.target.value);
                  if (fieldErrors.slaDays) setFieldErrors((p) => ({ ...p, slaDays: undefined }));
                }}
                aria-describedby={describedBy}
                aria-invalid={!!fieldErrors.slaDays}
                className={inputClass(!!fieldErrors.slaDays)}
              />
            )}
          </Field>

          <div className="flex flex-wrap gap-x-10 gap-y-4">
            <Toggle
              label={t('autoEscalate')}
              stateLabel={autoEscalate ? t('active') : t('inactive')}
              checked={autoEscalate}
              onChange={setAutoEscalate}
            />
            <Toggle
              label={t('notifyOnSubmit')}
              stateLabel={notifyOnSubmit ? t('active') : t('inactive')}
              checked={notifyOnSubmit}
              onChange={setNotifyOnSubmit}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={onClose} className="text-gray-700">{t('cancel')}</Button>
          <Button type="submit" isLoading={isSaving}>
            <Save className="w-4 h-4 mr-2" aria-hidden="true" />
            {t('saveShort')}
          </Button>
        </div>
      </form>
    </FormShell>
  );
}
