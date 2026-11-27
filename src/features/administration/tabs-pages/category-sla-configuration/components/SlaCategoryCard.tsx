"use client";

import { useEffect, useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Edit2, Save } from 'lucide-react';
import { z } from 'zod';
import { SlaCategory } from './types';
import { describeSaveError } from './apiErrorMessage';
import { GrievanceTypesSection } from './GrievanceTypesSection';
import type { GrievanceTypeRecord } from './taxonomyTypes';

interface SlaCategoryCardProps {
    categoryData: SlaCategory;
    isLast?: boolean;
    /** The category's active grievance types. */
    grievanceTypes?: GrievanceTypeRecord[];
    /** The default category takes unclassified cases, so the service won't deactivate it. */
    isDefaultCategory?: boolean;
    /** Each absent when the viewer can't change the taxonomy. */
    onAddType?: (typeName: string) => Promise<void>;
    onDeactivateType?: (grievanceTypeId: string) => Promise<void>;
    onDeactivateCategory?: () => Promise<void>;
    /** Renames the category. The service queues a rename, so the old name shows until it runs. */
    onRenameCategory?: (newName: string) => Promise<void>;
    /** Set while a queued rename is running; the name can't change again until it finishes. */
    renamingTo?: string | null;
}

export function SlaCategoryCard({
    categoryData,
    isLast = false,
    grievanceTypes = [],
    isDefaultCategory = false,
    onAddType,
    onDeactivateType,
    onDeactivateCategory,
    onRenameCategory,
    renamingTo = null,
}: SlaCategoryCardProps) {
    const t = useTranslations('admin.taxonomy');
    const [isExpanded, setIsExpanded] = useState(false);
    const [isSavingSla, setIsSavingSla] = useState(false);
    const [slaMessage, setSlaMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
    const [categoryNameText, setCategoryNameText] = useState(categoryData.category);
    const [isConfirmingDeactivate, setIsConfirmingDeactivate] = useState(false);
    const [isDeactivating, setIsDeactivating] = useState(false);
    const canRename = !!onRenameCategory && !renamingTo;

    const categoryLabelId = useId();

    // Re-seeds the editable fields from the latest server data whenever the card is
    // (re)opened — fixes two things at once: a stale display after this same component
    // instance survives a reload (the card is keyed by category, which doesn't change, so
    // its local state was never re-initialized from fresh props), and "Cancel" not actually
    // discarding an in-progress edit (it only collapsed the card; the edited values stayed
    // in state and could be saved later without the admin touching anything else).
    useEffect(() => {
        if (!isExpanded) return;
        // Re-seeding on every open (not just once) is the point — each open should reflect
        // whatever the server now holds, not whatever was in state from a previous visit.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCategoryNameText(categoryData.category);
        setSlaMessage(null);
        setIsConfirmingDeactivate(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately re-seeds only on open, not on every categoryData change while mid-edit
    }, [isExpanded]);

    const handleSaveName = async () => {
        if (!onRenameCategory) return;
        const parsed = z.string().trim().min(1, t('nameRequired')).max(140, t('nameTooLong')).safeParse(categoryNameText);
        if (!parsed.success) {
            setSlaMessage({ kind: 'error', text: parsed.error.issues[0]?.message ?? t('nameRequired') });
            return;
        }
        setIsSavingSla(true);
        setSlaMessage(null);
        try {
            if (canRename && parsed.data !== categoryData.category) {
                await onRenameCategory(parsed.data);
                setSlaMessage({ kind: 'success', text: t('categoryRenameQueued', { name: parsed.data }) });
            }
        } catch (err) {
            setSlaMessage({
                kind: 'error',
                text: describeSaveError(err, {
                    auth: t('authError'),
                    forbidden: t('forbiddenError'),
                    connection: t('connectionError'),
                    fallback: t('saveFailed'),
                }),
            });
        } finally {
            setIsSavingSla(false);
        }
    };

    const handleDeactivateCategory = async () => {
        if (!onDeactivateCategory) return;
        setIsDeactivating(true);
        setSlaMessage(null);
        try {
            await onDeactivateCategory();
        } catch (err) {
            setSlaMessage({
                kind: 'error',
                text: describeSaveError(err, {
                    auth: t('authError'),
                    forbidden: t('forbiddenError'),
                    connection: t('connectionError'),
                    fallback: t('saveFailed'),
                }),
            });
            setIsConfirmingDeactivate(false);
        } finally {
            setIsDeactivating(false);
        }
    };

    return (
        <div className={`bg-white border border-gray-200 ${isLast ? 'mb-0' : 'mb-4'} last:mb-0 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 rounded-xl`}>
            {/* Header (always visible) */}
            <div
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 cursor-pointer transition-colors gap-4 sm:gap-0"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 flex-1 w-full">
                    <div className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider leading-snug text-balance ${categoryData.categoryColor} w-fit sm:w-44 min-h-8 flex items-center justify-center text-center shrink-0`}>
                        {categoryData.category}
                    </div>

                    <div className="flex flex-col gap-0.5 flex-1 w-full min-w-0">
                        <div className="flex items-center gap-3">
                            <div className="h-1.5 bg-gray-100 rounded-full flex-1 overflow-hidden">
                                <div
                                    className="h-full bg-[#16A34A] rounded-full"
                                    style={{ width: `${categoryData.progressPercentage ?? 0}%` }}
                                ></div>
                            </div>
                        </div>
                        <div className='flex justify-end'>
                            <span className="text-xs font-semibold text-gray-700">{categoryData.slaDays == null ? t('noBaseRule') : t('baseDays', { days: categoryData.slaDays })}</span>
                        </div>

                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between sm:justify-end gap-4 sm:gap-6 w-full sm:w-auto ml-0 sm:ml-6 shrink-0 mt-2 sm:mt-0">
                    <button
                        className="p-2 rounded-full border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors ml-auto sm:ml-2"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(!isExpanded);
                        }}
                    >
                        <Edit2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Expanded Form */}
            {isExpanded && (
                <div className="border-t border-gray-100 bg-white">
                    <div className="p-0">
                        <div className=' bg-[#ECECF0]/30 p-6'>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                                {/* Category name */}
                                <div className="col-span-1 md:col-span-2 flex flex-col gap-2">
                                    <label htmlFor={categoryLabelId} className="text-sm font-medium text-gray-800">
                                        {t('serviceCategory')}
                                    </label>
                                    <input
                                        id={categoryLabelId}
                                        type="text"
                                        value={categoryNameText}
                                        maxLength={140}
                                        readOnly={!canRename}
                                        onChange={(e) => setCategoryNameText(e.target.value)}
                                        className={
                                            canRename
                                                ? 'w-full bg-white border border-gray-200 rounded-lg py-2.5 px-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-transparent'
                                                : 'w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-3 text-sm text-gray-500 cursor-not-allowed focus:outline-none'
                                        }
                                    />
                                    {renamingTo && (
                                        <span className="text-[11px] text-gray-500">{t('categoryRenamePending', { name: renamingTo })}</span>
                                    )}
                                </div>
                            </div>

                            <GrievanceTypesSection
                                types={grievanceTypes}
                                onAddType={onAddType}
                                onDeactivateType={onDeactivateType}
                            />

                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-3 py-6 px-6 border-t border-[#ECECF0]">
                            {onDeactivateCategory && !isDefaultCategory && (
                                isConfirmingDeactivate ? (
                                    <span className="flex items-center gap-2">
                                        <span className="text-xs text-gray-600">{t('deactivateCategoryConfirm')}</span>
                                        <button
                                            type="button"
                                            disabled={isDeactivating}
                                            onClick={() => void handleDeactivateCategory()}
                                            className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                                        >
                                            {t('deactivate')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsConfirmingDeactivate(false)}
                                            className="px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                                        >
                                            {t('cancel')}
                                        </button>
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setIsConfirmingDeactivate(true)}
                                        className="px-4 py-2.5 text-sm font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                                    >
                                        {t('deactivateCategory')}
                                    </button>
                                )
                            )}
                            {slaMessage && (
                                <span
                                    role={slaMessage.kind === 'error' ? 'alert' : 'status'}
                                    className={`mr-auto text-xs font-medium ${slaMessage.kind === 'error' ? 'text-red-600' : 'text-[#16A34A]'}`}
                                >
                                    {slaMessage.text}
                                </span>
                            )}
                            <button
                                type="button"
                                className="px-6 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                onClick={() => {
                                    // Revert immediately rather than relying solely on the
                                    // reseed-on-reopen effect, so a save triggered from outside
                                    // this card in between can never pick up a discarded edit.
                                    setCategoryNameText(categoryData.category);
                                    setSlaMessage(null);
                                    setIsExpanded(false);
                                }}
                            >
                                {t('cancel')}
                            </button>
                            {canRename && (
                                <button
                                    type="button"
                                    disabled={isSavingSla}
                                    onClick={() => void handleSaveName()}
                                    className="px-6 py-2.5 text-sm font-bold text-white bg-[#16A34A] rounded-lg hover:bg-[#10883c] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                                >
                                    <Save className="w-4 h-4" />
                                    {t('saveCategory')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
