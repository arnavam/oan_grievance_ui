"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Info, RefreshCw, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { NotificationCard } from './components/NotificationCard';
import {
    fetchNotificationPlaceholders,
    fetchNotificationTemplateOptions,
    fetchNotificationTemplates,
    updateNotificationTemplate,
    MAX_PAGE_SIZE,
} from './api/notificationTemplatesApi';
import type {
    FlatRecipientOption,
    NotificationTemplate,
    NotificationTemplateListData,
    PlaceholderItem,
    UpdateNotificationTemplatePayload,
} from './components/types';

export default function NotificationConfigPage() {
    const t = useTranslations('admin.notifications');
    const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
    const [placeholders, setPlaceholders] = useState<PlaceholderItem[]>([]);
    const [recipientOptions, setRecipientOptions] = useState<FlatRecipientOption[]>([]);
    const [pagination, setPagination] = useState<NotificationTemplateListData['pagination']>(undefined);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [channelFilter, setChannelFilter] = useState<'All' | 'SMS' | 'Email'>('All');
    const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Disabled'>('All');
    const [recipientFilter, setRecipientFilter] = useState<string>('All');

    const reload = useCallback(() => {
        setIsLoading(true);
        setReloadKey((k) => k + 1);
    }, []);

    useEffect(() => {
        let cancelled = false;

        fetchNotificationTemplateOptions()
            .then((res) => {
                if (cancelled) return;
                if (res?.placeholders) {
                    setPlaceholders(res.placeholders);
                }
                if (res?.recipients) {
                    setRecipientOptions(res.recipients);
                }
            })
            .catch(() => {
                if (cancelled) return;
                // Non-blocking fallback
                fetchNotificationPlaceholders()
                    .then((res) => {
                        if (!cancelled && res?.placeholders) {
                            setPlaceholders(res.placeholders);
                        }
                    })
                    .catch(() => {});
            });

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        fetchNotificationTemplates(
            { page: currentPage, page_size: MAX_PAGE_SIZE },
            { signal: controller.signal }
        )
            .then((data) => {
                setTemplates(data?.templates ?? []);
                setPagination(data?.pagination);
                setError(null);
            })
            .catch((err) => {
                if (controller.signal.aborted) return;
                setError(err instanceof Error && err.message ? err.message : t('loadFailed'));
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            });

        return () => controller.abort();
    }, [reloadKey, currentPage, t]);

    const handleUpdate = async (templateName: string, payload: UpdateNotificationTemplatePayload) => {
        const res = await updateNotificationTemplate(templateName, payload);
        if (res?.template) {
            setTemplates((prev) =>
                prev.map((t) => (t.name === templateName ? res.template : t))
            );
        } else {
            reload();
        }
    };

    const filteredTemplates = useMemo(() => {
        return templates.filter((tpl) => {
            // Channel filter
            if (channelFilter !== 'All' && tpl.channel !== channelFilter) {
                return false;
            }
            // Status filter
            if (statusFilter === 'Active' && !tpl.enabled) return false;
            if (statusFilter === 'Disabled' && tpl.enabled) return false;

            // Recipient filter
            if (recipientFilter !== 'All') {
                if (recipientFilter === 'Submitter') {
                    if (tpl.recipient_type !== 'Submitter') return false;
                } else if (recipientFilter === 'Assigned Officer') {
                    if (tpl.recipient_type !== 'Assigned Officer') return false;
                } else if (recipientFilter === 'department_head') {
                    if (tpl.role_level !== 'department_head' && tpl.recipient_type !== 'Department Officer') return false;
                } else {
                    if (tpl.role_level !== recipientFilter) return false;
                }
            }

            // Search filter
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                const matched =
                    tpl.name.toLowerCase().includes(term) ||
                    tpl.event.toLowerCase().includes(term) ||
                    (tpl.subject && tpl.subject.toLowerCase().includes(term)) ||
                    (tpl.body && tpl.body.toLowerCase().includes(term)) ||
                    (tpl.role_level_name && tpl.role_level_name.toLowerCase().includes(term));
                if (!matched) return false;
            }

            return true;
        });
    }, [templates, channelFilter, statusFilter, recipientFilter, searchTerm]);

    const counts = useMemo(() => {
        const total = pagination?.total_count ?? templates.length;
        const active = templates.filter((t) => t.enabled).length;
        const sms = templates.filter((t) => t.channel === 'SMS').length;
        const email = templates.filter((t) => t.channel === 'Email').length;
        return { total, active, sms, email };
    }, [templates, pagination]);

    return (
        <div className="w-full flex flex-col h-[calc(100vh-230px)] bg-white border border-gray-200 rounded-xl overflow-hidden font-sans shadow-sm">

            {/* Top Bar: Info Banner & Metric Chips */}
            <div className="p-5 pb-4 shrink-0 border-b border-gray-200 bg-white z-10 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#F0F7FF] border border-[#D6E8FF] rounded-lg p-3">
                    <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-[#1447E6] shrink-0" />
                        <span className="text-xs font-semibold text-[#1447E6]">
                            {t('banner')}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-medium self-end sm:self-auto shrink-0">
                        <span className="px-2.5 py-0.5 rounded-full bg-white border border-blue-200 text-blue-800">
                            {t('total')}: <strong className="font-bold">{counts.total}</strong>
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800">
                            {t('active')}: <strong className="font-bold">{counts.active}</strong>
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800">
                            {t('sms')}: <strong className="font-bold">{counts.sms}</strong>
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800">
                            {t('email')}: <strong className="font-bold">{counts.email}</strong>
                        </span>
                    </div>
                </div>

                {/* Filter Toolbar */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 stroke-[2.5]" />
                        <input
                            type="text"
                            placeholder={t('searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] transition-all"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        {/* Channel selector */}
                        <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                            {(['All', 'Email', 'SMS'] as const).map((ch) => (
                                <button
                                    key={ch}
                                    type="button"
                                    onClick={() => setChannelFilter(ch)}
                                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${channelFilter === ch
                                        ? 'bg-white text-gray-800 shadow-xs'
                                        : 'text-gray-500 hover:text-gray-800'}`}
                                >
                                    {ch === 'All' ? t('allChannels') : ch}
                                </button>
                            ))}
                        </div>

                        {/* Status selector */}
                        <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                            {(['All', 'Active', 'Disabled'] as const).map((st) => (
                                <button
                                    key={st}
                                    type="button"
                                    onClick={() => setStatusFilter(st)}
                                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${statusFilter === st
                                        ? 'bg-white text-gray-800 shadow-xs'
                                        : 'text-gray-500 hover:text-gray-800'}`}
                                >
                                    {st === 'All' ? t('allStatus') : st === 'Active' ? t('active') : t('disabled')}
                                </button>
                            ))}
                        </div>

                        {/* Recipient dropdown */}
                        <select
                            value={recipientFilter}
                            onChange={(e) => setRecipientFilter(e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#16A34A]"
                        >
                            <option value="All">{t('allRecipients')}</option>
                            {recipientOptions.length > 0 ? (
                                recipientOptions.map((r) => {
                                    const val =
                                        r.id === 'submitter'
                                            ? 'Submitter'
                                            : r.id === 'assigned_officer'
                                            ? 'Assigned Officer'
                                            : r.id;
                                    return (
                                        <option key={r.id} value={val}>
                                            {r.label}
                                        </option>
                                    );
                                })
                            ) : (
                                <>
                                    <option value="Submitter">Submitter</option>
                                    <option value="Assigned Officer">Assigned Officer</option>
                                    <option value="nodal_officer">Nodal Officer (L1)</option>
                                    <option value="senior_nodal_officer">Senior Nodal Officer (L2)</option>
                                    <option value="department_head">Department Head (L3)</option>
                                </>
                            )}
                        </select>

                        <button
                            type="button"
                            onClick={reload}
                            disabled={isLoading}
                            className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                            title={t('refreshTooltip')}
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto [scrollbar-color:#16A34A_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#16A34A] [&::-webkit-scrollbar-thumb]:rounded-full">
                <div className="p-5 flex flex-col">
                    {pagination && pagination.total_count > templates.length && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs font-medium">
                            {t('paginationWarning', { count: templates.length, total: pagination.total_count })}
                        </div>
                    )}

                    {error && (
                        <div className="mb-4">
                            <ErrorAlert>
                                <div className="flex items-center justify-between w-full">
                                    <span>{error}</span>
                                    <button
                                        type="button"
                                        onClick={reload}
                                        className="ml-4 underline font-semibold hover:text-red-900"
                                    >
                                        {t('tryAgain')}
                                    </button>
                                </div>
                            </ErrorAlert>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="py-16 flex flex-col items-center justify-center gap-3 text-gray-400">
                            <Loader2 className="w-8 h-8 animate-spin text-[#16A34A]" />
                            <span className="text-sm font-medium text-gray-500">
                                {t('loading')}
                            </span>
                        </div>
                    ) : (
                        <>
                            <NotificationCard
                                notifications={filteredTemplates}
                                onUpdate={handleUpdate}
                                placeholders={placeholders}
                                recipientOptions={recipientOptions}
                            />
                            {pagination && pagination.total_pages > 1 && (
                                <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-200 text-xs text-gray-500">
                                    <span>{t('pageOf', { page: pagination.page, total: pagination.total_pages })}</span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            disabled={!pagination.has_prev && pagination.page <= 1}
                                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                            className="px-3 py-1 rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            {t('previous')}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={!pagination.has_next && pagination.page >= pagination.total_pages}
                                            onClick={() => setCurrentPage((p) => p + 1)}
                                            className="px-3 py-1 rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            {t('next')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

        </div>
    );
}
