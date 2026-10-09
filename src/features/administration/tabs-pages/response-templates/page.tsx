"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search, Info } from 'lucide-react';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useIsReviewOfficer } from '@/features/auth/hooks/useIsReviewOfficer';
import { useGrievanceOptions } from '@/features/metadata';
import {
  createResponseTemplate,
  fetchResponseTemplates,
  MAX_PAGE_SIZE,
  retireResponseTemplate,
  updateResponseTemplate,
} from './api/responseTemplatesApi';
import { ResponseTemplateRow } from './components/ResponseTemplateRow';
import { CategoryDropdown } from './components/CategoryDropdown';
import { ResponseTemplateFormModal, type SelectOption } from './components/ResponseTemplateFormModal';
import type {
  CreateResponseTemplatePayload,
  ResponseTemplate,
  UpdateResponseTemplatePayload,
} from './components/types';

/** `null` = form closed, `'new'` = adding, a template = editing it. */
type FormState = null | 'new' | ResponseTemplate;

export default function ResponseTemplatesPage() {
    const t = useTranslations('admin.responseTemplates');
    // A Review Officer can view this tab (route access — see rbac.ts) but PR #47/STG-434
    // refuses every create/edit/retire call for it server-side, so those controls are
    // hidden here rather than left to fail with a 403 on click — same pattern as the
    // officer-management screens' `canManage`/`canEdit`.
    const canManage = !useIsReviewOfficer();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');

    const [templates, setTemplates] = useState<ResponseTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [busyTemplate, setBusyTemplate] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [form, setForm] = useState<FormState>(null);

    const { data: grievanceOptions } = useGrievanceOptions();

    const reload = useCallback(() => setReloadKey((key) => key + 1), []);

    useEffect(() => {
        const controller = new AbortController();
        fetchResponseTemplates(
            { page_size: MAX_PAGE_SIZE, service_category: selectedCategory || undefined },
            { signal: controller.signal }
        )
            .then((data) => {
                setTemplates(data?.response_templates ?? []);
                setError(null);
            })
            .catch((err) => {
                if (controller.signal.aborted) return;
                setError(err instanceof Error && err.message ? err.message : t('loadFailed'));
            })
            .finally(() => {
                if (!controller.signal.aborted) setIsLoading(false);
            });
        return () => controller.abort();
    }, [selectedCategory, reloadKey, t]);

    const actions: SelectOption[] = useMemo(() => [
        { value: 'Resolve', label: 'Resolve' },
        { value: 'Partially Resolve', label: 'Partially Resolve' },
        { value: 'Request More Info', label: 'Request More Info' },
        { value: 'Refer Onward', label: 'Refer Onward' },
        { value: 'Reject', label: 'Reject' },
        { value: 'Submit Response', label: 'Submit Response' },
    ], []);

    const departments = useMemo<SelectOption[]>(
        () => (grievanceOptions?.departments ?? []).map((d) => ({ value: d.department_id, label: d.department_name })),
        [grievanceOptions]
    );
    const serviceCategories = useMemo<SelectOption[]>(
        () => (grievanceOptions?.service_categories ?? []).map((c) => ({ value: c.category_name, label: c.category_name })),
        [grievanceOptions]
    );
    const departmentName = (id: string | null | undefined) =>
        id ? departments.find((d) => d.value === id)?.label ?? id : null;

    const filteredTemplates = useMemo(() => {
        const search = searchTerm.trim().toLowerCase();
        if (!search) return templates;
        return templates.filter((template) =>
            [template.template, template.title, template.action, template.body].some((field) =>
                (field || '').toLowerCase().includes(search)
            )
        );
    }, [templates, searchTerm]);

    const handleCreate = async (payload: CreateResponseTemplatePayload) => {
        await createResponseTemplate(payload);
        reload();
    };

    const handleUpdate = async (template: string, payload: UpdateResponseTemplatePayload) => {
        await updateResponseTemplate(template, payload);
        reload();
    };

    const runRowAction = async (template: ResponseTemplate, action: () => Promise<unknown>) => {
        setBusyTemplate(template.template);
        setActionError(null);
        try {
            await action();
            reload();
        } catch (err) {
            setActionError(err instanceof Error && err.message ? err.message : t('saveFailed'));
        } finally {
            setBusyTemplate(null);
        }
    };

    const handleRetire = (template: ResponseTemplate) => {
        if (!window.confirm(t('retireConfirm', { title: template.title }))) return;
        void runRowAction(template, () => retireResponseTemplate(template.template));
    };

    const handleReactivate = (template: ResponseTemplate) =>
        void runRowAction(template, () => updateResponseTemplate(template.template, { is_active: true }));

    return (
        <div className="w-full flex flex-col h-[calc(100vh-230px)] bg-white border border-gray-200 rounded-xl overflow-hidden">

            {/* Header - Fixed at top */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 shrink-0">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                    <input
                        type="search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={t('searchPlaceholder')}
                        aria-label={t('searchPlaceholder')}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A] transition-colors placeholder:text-gray-400"
                    />
                </div>

                <div className="flex items-center gap-4">
                    <CategoryDropdown
                        categories={serviceCategories.map((c) => c.value)}
                        value={selectedCategory}
                        onChange={setSelectedCategory}
                    />

                    {canManage && (
                        <button
                            type="button"
                            onClick={() => setForm('new')}
                            className="mt-5 px-4 py-2.5 bg-[#16A34A] text-white rounded-lg text-sm font-bold hover:bg-[#15803d] transition-colors"
                        >
                            {t('addButton')}
                        </button>
                    )}
                </div>
            </div>

            {/* Scrollable Area - Flush with edges */}
            <div className="flex-1 overflow-y-auto [scrollbar-color:#16A34A_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#16A34A] [&::-webkit-scrollbar-thumb]:rounded-full">
                <div className="p-6">
                    {/* Info Banner */}
                    <div className="flex items-center gap-2 bg-[#F0F7FF] border border-[#D6E8FF] rounded-lg p-3 mb-6 shrink-0">
                        <Info className="w-4 h-4 text-[#1447E6] shrink-0" aria-hidden="true" />
                        <span className="text-xs font-semibold text-[#1447E6]">{t('banner', { exampleA: '{{ ticket_number }}', exampleB: '{{ officer_name }}' })}</span>
                    </div>

                    {actionError && <ErrorAlert className="mb-4">{actionError}</ErrorAlert>}

                    {isLoading ? (
                        <p className="text-sm text-gray-500" role="status">{t('loading')}</p>
                    ) : error ? (
                        <ErrorAlert>
                            {error}{' '}
                            <button type="button" onClick={reload} className="underline font-semibold">
                                {t('retry')}
                            </button>
                        </ErrorAlert>
                    ) : filteredTemplates.length === 0 ? (
                        <p className="text-sm text-gray-500">{t('empty')}</p>
                    ) : (
                        <div className="flex flex-col">
                            {filteredTemplates.map((template, index) => (
                                <ResponseTemplateRow
                                    key={template.template}
                                    template={template}
                                    departmentName={departmentName(template.department)}
                                    isLast={index === filteredTemplates.length - 1}
                                    isBusy={busyTemplate === template.template}
                                    canManage={canManage}
                                    onEdit={setForm}
                                    onRetire={handleRetire}
                                    onReactivate={handleReactivate}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {form !== null && (
                <ResponseTemplateFormModal
                    template={form === 'new' ? null : form}
                    actions={actions}
                    departments={departments}
                    serviceCategories={serviceCategories}
                    onCreate={handleCreate}
                    onUpdate={handleUpdate}
                    onClose={() => setForm(null)}
                />
            )}
        </div>
    );
}
