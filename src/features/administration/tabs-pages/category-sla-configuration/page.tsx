"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useIsReviewOfficer } from '@/features/auth/hooks/useIsReviewOfficer';
import { useGrievanceOptions } from '@/features/metadata';
import {
    createGrievanceType,
    createServiceCategory,
    fetchServiceCategories,
    MAX_PAGE_SIZE,
} from './api/taxonomyApi';
import { fetchSlaConfigurations, updateSlaConfiguration } from './api/slaSettingsApi';
import { AddCategoryModal } from './components/AddCategoryModal';
import { describeSaveError } from './components/apiErrorMessage';
import { GlobalSlaPolicyCard } from './components/GlobalSlaPolicyCard';
import { SlaCategoryCard } from './components/SlaCategoryCard';
import type { ServiceCategoryRecord } from './components/taxonomyTypes';
import type { SlaConfiguration } from './components/slaSettingsTypes';
import { CATEGORY_COLORS, type SlaCategory } from './components/types';

/**
 * A fixed reference window for the card's length-of-SLA bar, not a business rule — just
 * something stable to compare against. Previously this was the longest `sla_days` among
 * whichever categories happened to be loaded, so every bar's meaning silently shifted
 * depending on what else was on the page (a 5-day SLA read as "3/4 full" purely because
 * the longest other category was 7 days). 30 matches the Global SLA Policy card's own
 * `max_deferral_days` default shown above it on this same page, so the two numbers agree
 * instead of implying two different "typical maximums".
 */
const SLA_BAR_REFERENCE_DAYS = 30;

/**
 * One card per category: its SLA window, auto-escalate and notify-on-breach
 * flags (GET /api/v1/sla-configurations), shared by every department that
 * serves the category. The card names those departments.
 */
function toSlaCategory(config: SlaConfiguration, colorIndex: number, departmentNames: string): SlaCategory {
    return {
        id: config.name,
        category: config.service_category,
        categoryColor: CATEGORY_COLORS[colorIndex % CATEGORY_COLORS.length] ?? '',
        department: departmentNames,
        configId: config.name,
        slaDays: config.sla_days,
        autoEscalate: config.auto_escalate,
        notifyOnBreach: config.notify_on_breach,
        progressPercentage: Math.min(100, Math.round((config.sla_days / SLA_BAR_REFERENCE_DAYS) * 100)),
    };
}

export default function CategorySlaConfigurationPage() {
    const t = useTranslations('admin.taxonomy');
    // A Review Officer can read this tab, but the service refuses every write for that role, so the
    // controls are hidden rather than left to fail with a 403 — the same `canManage` pattern as
    // Response Templates. UX only; the service is the enforcement boundary.
    const canManage = !useIsReviewOfficer();
    const [categories, setCategories] = useState<ServiceCategoryRecord[]>([]);
    const [configs, setConfigs] = useState<SlaConfiguration[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [isAdding, setIsAdding] = useState(false);
    // Said after a category is added: it has no SLA window yet, so no card shows for it.
    const [notice, setNotice] = useState<string | null>(null);
    // Category creation and its first grievance type are two separate calls; if the category
    // succeeds but the type fails, the modal stays open so the admin can retry — but retrying
    // naively would call createServiceCategory again and hit a duplicate-name rejection, since
    // the category already exists. Remembering which name already succeeded lets a retry skip
    // straight to creating the type instead. Cleared whenever the modal is opened fresh.
    const [categoryAlreadyCreated, setCategoryAlreadyCreated] = useState<string | null>(null);
    const { data: grievanceOptions } = useGrievanceOptions();

    const reload = useCallback(() => setReloadKey((key) => key + 1), []);

    useEffect(() => {
        const controller = new AbortController();
        Promise.all([
            fetchServiceCategories({ page_size: MAX_PAGE_SIZE }, { signal: controller.signal }),
            fetchSlaConfigurations({ page_size: MAX_PAGE_SIZE }, { signal: controller.signal }),
        ])
            .then(([categoryData, configData]) => {
                setCategories(categoryData?.service_categories ?? []);
                setConfigs(configData?.sla_configurations ?? []);
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
    }, [reloadKey, t]);

    const cards = useMemo(() => {
        const departments = new Map((grievanceOptions?.departments ?? []).map((d) => [d.department_id, d.department_name]));
        // A config's category missing from `categories` (a stale fetch race, or a category
        // beyond the page_size cap) used to collapse to the same color as "found at index 0"
        // (`Math.max(0, -1)` is 0 either way) — falls back to a hash of the name instead, so a
        // genuine index-0 match and a true miss don't silently look identical.
        const colorOf = (name: string) => {
            const index = categories.findIndex((c) => c.category_name === name);
            if (index >= 0) return index;
            let hash = 0;
            for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0;
            return Math.abs(hash);
        };
        return configs.map((config) =>
            toSlaCategory(
                config,
                colorOf(config.service_category),
                config.departments.map((id) => departments.get(id) ?? id).join(', ') || t('noDepartment')
            )
        );
    }, [categories, configs, grievanceOptions, t]);

    const handleSaveSla = async (
        configId: string,
        values: { sla_days: number; auto_escalate: boolean; notify_on_breach: boolean }
    ) => {
        await updateSlaConfiguration(configId, values);
        reload();
    };

    return (
        <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm h-[calc(100vh-230px)] flex flex-col overflow-hidden">
            {/* Scrollable Content (Global Policy + Per-Category) */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col [scrollbar-color:#16A34A_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#16A34A] [&::-webkit-scrollbar-thumb]:rounded-full">

                {/* Section 1: Global SLA Policy — GlobalSlaPolicyCard carries its own heading. */}
                <GlobalSlaPolicyCard canManage={canManage} />

                {notice && (
                    <div
                        role="status"
                        className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-[#B7ECC9] bg-[#E1F9E8] p-4 text-sm font-medium text-[#1A9F53]"
                    >
                        <span>{notice}</span>
                        <button type="button" onClick={() => setNotice(null)} className="shrink-0 underline font-semibold">
                            {t('dismiss')}
                        </button>
                    </div>
                )}

                {/* Section 2: Per-Category SLA Windows — its own heading, with Add Category here rather than at the page's top. */}
                <div className="flex items-start justify-between gap-4 pt-2 pb-4 mb-4 border-b border-gray-200">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-1">Per-Category SLA Windows</h2>
                        <p className="text-sm text-gray-500">
                            Edit the SLA deadline and escalation behaviour for each service category.
                        </p>
                    </div>
                    {canManage && (
                        <button
                            type="button"
                            onClick={() => setIsAdding(true)}
                            className="shrink-0 px-4 py-2.5 bg-[#16A34A] text-white rounded-lg text-sm font-bold hover:bg-[#15803d] transition-colors"
                        >
                            {t('addCategoryButton')}
                        </button>
                    )}
                </div>

                {isLoading ? (
                    <p className="text-sm text-gray-500" role="status">{t('loading')}</p>
                ) : error ? (
                    <ErrorAlert>
                        {error}{' '}
                        <button type="button" onClick={reload} className="underline font-semibold">{t('retry')}</button>
                    </ErrorAlert>
                ) : cards.length === 0 ? (
                    <p className="text-sm text-gray-500">{t('empty')}</p>
                ) : (
                    <div className="flex flex-col">
                        {cards.map((card) => (
                            <SlaCategoryCard key={card.id} categoryData={card} onSaveSla={canManage ? handleSaveSla : undefined} />
                        ))}
                    </div>
                )}

            </div>

            {canManage && isAdding && (
                <AddCategoryModal
                    takenCodes={categories.map((c) => c.code)}
                    onCreate={async (payload, firstType) => {
                        // A retry after the type-creation step failed: the category already
                        // exists under this exact name, so skip straight to the type instead of
                        // repeating createServiceCategory and hitting a duplicate-name rejection.
                        if (categoryAlreadyCreated !== payload.category_name) {
                            await createServiceCategory(payload);
                            setCategoryAlreadyCreated(payload.category_name);
                            reload();
                        }
                        try {
                            await createGrievanceType({ service_category: payload.category_name, type_name: firstType });
                            setCategoryAlreadyCreated(null);
                            setNotice(t('categoryCreatedNotice', { name: payload.category_name }));
                        } catch (err) {
                            throw new Error(
                                t('categoryCreatedTypeFailed', {
                                    reason: describeSaveError(err, {
                                        auth: t('authError'),
                                        forbidden: t('forbiddenError'),
                                        connection: t('connectionError'),
                                        fallback: t('saveFailed'),
                                    }),
                                })
                            );
                        }
                    }}
                    onClose={() => {
                        setCategoryAlreadyCreated(null);
                        setIsAdding(false);
                    }}
                />
            )}
        </div>
    );
}
