"use client";

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Save } from 'lucide-react';
import { z } from 'zod';
import { fetchGlobalSlaPolicy, updateGlobalSlaPolicy } from '../api/slaSettingsApi';
import { describeSaveError } from './apiErrorMessage';
import type { DeferralApproval } from './slaSettingsTypes';

/** The backend's `requires_supervisor_approval` boolean, as this radio group's two values. */
function approvalFromBoolean(requiresSupervisorApproval: boolean): DeferralApproval {
    return requiresSupervisorApproval ? 'l2_approval' : 'l1_self_approve';
}
function booleanFromApproval(value: DeferralApproval): boolean {
    return value === 'l2_approval';
}

const inputClass =
    'w-full bg-white border border-gray-200 rounded-lg py-2.5 px-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400';

/** The installation-wide SLA policy (GET/PATCH /api/v1/sla-policy). */
export function GlobalSlaPolicyCard({ canManage = true }: { canManage?: boolean }) {
    const t = useTranslations('admin.slaPolicy');
    const [maxDeferralDays, setMaxDeferralDays] = useState('');
    const [threshold, setThreshold] = useState('');
    const [deferralPolicy, setDeferralPolicy] = useState<DeferralApproval>('l2_approval');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    // A policy that never loaded, or one the viewer may not change, is shown read-only.
    // A policy that never loaded must not be saved over: the form would hold blanks, not the real values.
    const [loaded, setLoaded] = useState(false);
    const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        fetchGlobalSlaPolicy({ signal: controller.signal })
            .then((data) => {
                setMaxDeferralDays(String(data.policy.max_deferral_days));
                setThreshold(String(data.policy.auto_escalation_threshold));
                setDeferralPolicy(approvalFromBoolean(data.policy.requires_supervisor_approval));
                setLoaded(true);
            })
            .catch((err) => {
                if (controller.signal.aborted) return;
                setMessage({
                    kind: 'error',
                    text: describeSaveError(err, {
                        auth: t('authError'),
                        forbidden: t('forbiddenError'),
                        connection: t('connectionError'),
                        fallback: t('loadFailed'),
                    }),
                });
            })
            .finally(() => {
                if (!controller.signal.aborted) setIsLoading(false);
            });
        return () => controller.abort();
    }, [t]);

    const handleSave = async () => {
        const schema = z.object({
            maxDeferralDays: z
                .string()
                .trim()
                .refine((v) => /^[1-9]\d*$/.test(v), t('deferralDaysInvalid')),
            threshold: z
                .string()
                .trim()
                .refine((v) => /^[1-9]\d*$/.test(v) && Number(v) <= 100, t('thresholdInvalid')),
        });
        const parsed = schema.safeParse({ maxDeferralDays, threshold });
        if (!parsed.success) {
            const firstIssue = parsed.error.issues[0];
            setMessage({ kind: 'error', text: firstIssue?.message ?? t('saveFailed') });
            return;
        }
        const days = Number(maxDeferralDays);
        const percent = Number(threshold);
        setIsSaving(true);
        setMessage(null);
        try {
            const data = await updateGlobalSlaPolicy({
                max_deferral_days: days,
                auto_escalation_threshold: percent,
                requires_supervisor_approval: booleanFromApproval(deferralPolicy),
            });
            setMaxDeferralDays(String(data.policy.max_deferral_days));
            setThreshold(String(data.policy.auto_escalation_threshold));
            setDeferralPolicy(approvalFromBoolean(data.policy.requires_supervisor_approval));
            setMessage({ kind: 'success', text: t('saved') });
        } catch (err) {
            setMessage({
                kind: 'error',
                text: describeSaveError(err, {
                    auth: t('authError'),
                    forbidden: t('forbiddenError'),
                    connection: t('connectionError'),
                    fallback: t('saveFailed'),
                }),
            });
        } finally {
            setIsSaving(false);
        }
    };

    const editable = loaded && canManage;

    const radio = (value: DeferralApproval, label: string) => (
        <label className="flex items-center gap-2 cursor-pointer group">
            <div className="relative flex items-center justify-center w-5 h-5">
                <input
                    type="radio"
                    name="deferralPolicy"
                    value={value}
                    checked={deferralPolicy === value}
                    disabled={!editable}
                    onChange={() => setDeferralPolicy(value)}
                    className="peer sr-only"
                />
                <div className="w-5 h-5 border border-gray-300 rounded-full group-hover:border-[#16A34A] peer-checked:border-[#16A34A] peer-focus-visible:ring-2 peer-focus-visible:ring-[#16A34A] transition-colors"></div>
                {deferralPolicy === value && <div className="absolute w-2.5 h-2.5 bg-[#16A34A] rounded-full"></div>}
            </div>
            <span className="text-sm font-medium text-gray-800">{label}</span>
        </label>
    );

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 mb-6">
            <div className="p-6 pb-4 border-b border-gray-200">
                <h2 className="text-base font-semibold text-gray-900 mb-1">{t('title')}</h2>
                <p className="text-sm text-gray-500">{t('description')}</p>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div className="flex flex-col gap-2">
                        <label htmlFor="sla-max-deferral" className="text-sm font-medium text-gray-800">{t('maxDeferralLabel')}</label>
                        <input
                            id="sla-max-deferral"
                            type="text"
                            inputMode="numeric"
                            value={maxDeferralDays}
                            disabled={!editable}
                            onChange={(e) => setMaxDeferralDays(e.target.value)}
                            className={inputClass}
                        />
                        <p className="text-xs text-gray-500 mt-1">{t('maxDeferralHint')}</p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="sla-threshold" className="text-sm font-medium text-gray-800">{t('thresholdLabel')}</label>
                        <input
                            id="sla-threshold"
                            type="text"
                            inputMode="numeric"
                            value={threshold}
                            disabled={!editable}
                            onChange={(e) => setThreshold(e.target.value)}
                            className={inputClass}
                        />
                        <p className="text-xs text-gray-500 mt-1">{t('thresholdHint')}</p>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <span className="text-sm font-medium text-gray-500">{t('deferralPolicyLabel')}</span>
                    <div className="flex items-center gap-6">
                        {radio('l2_approval', t('l2ApprovalLabel'))}
                        {radio('l1_self_approve', t('l1SelfApproveLabel'))}
                    </div>
                </div>
            </div>

            <div className="px-6 pt-4 pb-4 border-t border-gray-200 flex items-center justify-end gap-4 bg-white rounded-b-xl">
                {isLoading && <span className="mr-auto text-xs text-gray-500" role="status">{t('loading')}</span>}
                {message && (
                    <span
                        role={message.kind === 'error' ? 'alert' : 'status'}
                        className={`mr-auto text-xs font-medium ${message.kind === 'error' ? 'text-red-600' : 'text-[#16A34A]'}`}
                    >
                        {message.text}
                    </span>
                )}
                {canManage && (
                    <button
                        type="button"
                        disabled={!editable || isSaving}
                        onClick={() => void handleSave()}
                        className="flex items-center gap-2 bg-[#16A34A] hover:bg-[#10883c] text-white px-5 py-3 rounded-lg font-bold transition-colors text-sm disabled:opacity-50 disabled:pointer-events-none"
                    >
                        <Save className="w-4 h-4" />
                        {t('saveButton')}
                    </button>
                )}
            </div>
        </div>
    );
}
