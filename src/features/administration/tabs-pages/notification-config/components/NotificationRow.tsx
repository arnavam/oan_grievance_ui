/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useMemo, useState, useEffect } from 'react';
import { Eye, Pencil, FileText, X, Loader2, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { NotificationTemplate, PlaceholderItem, UpdateNotificationTemplatePayload, FlatRecipientOption } from './types';
import { TemplateBody, TemplateText } from './TemplateBody';
import { placeholderToken } from '../utils/placeholders';
import { channelBadgeClass, channelHasSubject } from '../utils/channels';
import { recipientIdOf, recipientLabelOf, recipientOptionOf } from '../utils/recipients';

interface NotificationRowProps {
    notification: NotificationTemplate;
    isLast?: boolean;
    canEdit: boolean;
    onUpdate: (templateName: string, payload: UpdateNotificationTemplatePayload) => Promise<void>;
    placeholders?: PlaceholderItem[];
    recipientOptions?: FlatRecipientOption[];
}

function formatEventTitle(name: string, event: string): string {
    const stripped = name.replace(/^Grievance:\s*/, '').replace(/\s*\((Email|SMS)\)$/, '');
    if (stripped) return stripped;
    return event.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function NotificationRow({ notification, isLast, canEdit, onUpdate, placeholders, recipientOptions = [] }: NotificationRowProps) {
    const t = useTranslations('admin.notifications');
    const OpenIcon = canEdit ? Pencil : Eye;
    const [isExpanded, setIsExpanded] = useState(false);
    const [isActive, setIsActive] = useState(notification.enabled);
    const [subject, setSubject] = useState(notification.subject || '');
    const [body, setBody] = useState(notification.body || '');
    const [selectedRecipientId, setSelectedRecipientId] = useState(() => recipientIdOf(notification, recipientOptions));
    const [isSaving, setIsSaving] = useState(false);
    const [isToggling, setIsToggling] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Sync draft state when not expanded and when notification prop changes.
    useEffect(() => {
        if (!isExpanded) {
            setSubject(notification.subject || '');
            setBody(notification.body || '');
            setSelectedRecipientId(recipientIdOf(notification, recipientOptions));
            setError(null);
        }
        setIsActive(notification.enabled);
    }, [notification, isExpanded, recipientOptions]);

    const channelLabel = t.has(`channelNames.${notification.channel}`) ? t(`channelNames.${notification.channel}`) : notification.channel;
    const hasSubject = channelHasSubject(notification.channel);
    const title = formatEventTitle(notification.name, notification.event);

    const displayRecipientLabel = useMemo(() => recipientLabelOf(notification, recipientOptions), [notification, recipientOptions]);

    const handleToggleActive = async (newVal: boolean) => {
        setIsActive(newVal);
        setIsToggling(true);
        try {
            await onUpdate(notification.name, { enabled: newVal });
        } catch (err) {
            setIsActive(!newVal);
            setError(err instanceof Error ? err.message : t('failedUpdateStatus'));
        } finally {
            setIsToggling(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        try {
            // Only send a recipient the service itself offered; with none to pick from, leave it as it is.
            const opt = recipientOptions.find((o) => o.id === selectedRecipientId);
            const unchanged = opt && recipientOptionOf(notification, recipientOptions)?.id === opt.id;
            await onUpdate(notification.name, {
                subject,
                body,
                enabled: isActive,
                ...(opt && !unchanged ? { recipient_type: opt.recipient_type, role_level: opt.role_level ?? null } : {}),
            });
            setIsExpanded(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('failedSaveTemplate'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setSubject(notification.subject || '');
        setBody(notification.body || '');
        setSelectedRecipientId(recipientIdOf(notification, recipientOptions));
        setError(null);
        setIsExpanded(false);
    };

    return (
        <div className={`bg-white border border-gray-200 rounded-xl shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 overflow-hidden ${isLast ? 'mb-0' : 'mb-3'} last:mb-0`}>
            <div className="bg-white p-5 flex items-center justify-between">
                <div className="flex-1 min-w-0 pr-4">
                    {/* Header Row */}
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-[11px] font-mono font-medium text-gray-400 shrink-0">
                            {notification.event}
                        </span>
                        <span className="text-sm font-semibold text-gray-900 truncate">
                            {title}
                        </span>

                        {/* Badges */}
                        <div className="flex items-center gap-1.5 ml-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isActive ? 'bg-[#DCFCE7] text-[#008236] border border-[#92F2B3]' : 'bg-[#F1F1F4] text-[#717182] border border-[#D4DBE9]'}`}>
                                {isActive ? t('active') : t('disabled')}
                            </span>
                            <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${channelBadgeClass(notification.channel)}`}
                            >
                                {channelLabel}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                {displayRecipientLabel}
                            </span>
                        </div>
                    </div>

                    {/* Subtitle / Preview */}
                    <div className="text-left">
                        {hasSubject ? (
                            <p className="text-[13px] text-gray-700 truncate font-medium mb-1">
                                {notification.subject}
                            </p>
                        ) : (
                            <p className="text-[13px] text-gray-500 truncate mb-1">
                                {notification.body}
                            </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 text-[12px] text-gray-400">
                            <span>{t('trigger')}: <span className="font-semibold text-gray-600">{notification.event}</span></span>
                            <span>•</span>
                            <span>{t('to')}: <span className="font-semibold text-gray-600">{displayRecipientLabel}</span></span>
                            {notification.placeholders && notification.placeholders.length > 0 && (
                                <>
                                    <span>•</span>
                                    <span className="text-[11px] font-mono text-blue-600 bg-blue-50/70 border border-blue-200/60 px-1.5 py-0.5 rounded">
                                        {t('variables')}: {notification.placeholders.join(', ')}
                                    </span>
                                </>
                            )}
                            {notification.condition && (
                                <>
                                    <span>•</span>
                                    <span className="font-mono text-[11px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                                        {t('condition')}: {notification.condition}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 shrink-0 ml-2">
                    {canEdit && (
                        <label className="relative inline-flex items-center cursor-pointer" title={isActive ? t('disableRule') : t('enableRule')}>
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={isActive}
                                disabled={isToggling}
                                onChange={(e) => handleToggleActive(e.target.checked)}
                            />
                            <div className={`w-10 h-5 rounded-full transition-colors duration-200 ease-in-out ${isActive ? 'bg-[#16A34A]' : 'bg-gray-300'} ${isToggling ? 'opacity-50' : ''}`}></div>
                            <div className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-all duration-200 ease-in-out transform shadow-sm ${isActive ? 'translate-x-5' : ''}`}></div>
                        </label>
                    )}
                    <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`relative w-8 h-8 rounded-lg border flex items-center justify-center transition-all duration-200 active:scale-95 ${isExpanded ? 'bg-[#F7F8FA] border-gray-300' : 'bg-white hover:bg-gray-50 border-gray-200'}`}
                        title={canEdit ? (isExpanded ? t('closeEditor') : t('editTemplate')) : (isExpanded ? t('closeTemplate') : t('viewTemplate'))}
                    >
                        <X className={`absolute w-4 h-4 text-gray-500 transition-all duration-200 ${isExpanded ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}`} />
                        <OpenIcon className={`absolute w-3.5 h-3.5 text-gray-500 transition-all duration-200 ${!isExpanded ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-50'}`} />
                    </button>
                </div>
            </div>

            {/* Expanded panel: editor, or a read-only view of the same template */}
            {isExpanded && (
                <div className="border-t border-gray-200">
                    <div className="p-6 bg-gray-50/50">
                        {!canEdit && (
                            <div className="flex flex-col gap-5">
                                <div>
                                    <h4 className="text-[13px] font-medium text-gray-500 mb-1">{t('recipient')}</h4>
                                    <p className="text-[14px] text-gray-800">{displayRecipientLabel}</p>
                                </div>
                                {hasSubject && (
                                    <div>
                                        <h4 className="text-[13px] font-medium text-gray-500 mb-1">{t('emailSubject')}</h4>
                                        <TemplateText value={notification.subject || ''} placeholders={placeholders} />
                                    </div>
                                )}
                                <div>
                                    <h4 className="text-[13px] font-medium text-gray-500 mb-1">{t('templateBody')}</h4>
                                    <TemplateText value={notification.body || ''} placeholders={placeholders} />
                                </div>
                            </div>
                        )}
                        {canEdit && (
                            <>
                                {error && (
                                    <div className="mb-5 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-medium">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                    {hasSubject && (
                                        <div className="md:col-span-2">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="block text-[13px] font-medium text-gray-500">
                                                    {t('emailSubject')} <span className="text-red-500">*</span>
                                                </label>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[11px] text-gray-400">{t('insert')}</span>
                                                    {(placeholders ?? []).map(placeholderToken).map((token) => (
                                                        <button
                                                            key={token}
                                                            type="button"
                                                            disabled={isSaving}
                                                            onClick={() => setSubject((prev) => (prev ? `${prev} ${token}` : token))}
                                                            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors disabled:opacity-50"
                                                            title={t('insertSubject', { token })}
                                                        >
                                                            {token}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <input
                                                type="text"
                                                value={subject}
                                                onChange={(e) => setSubject(e.target.value)}
                                                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-[14px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A]"
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-[13px] font-medium text-gray-500 mb-2">{t('channel')}</label>
                                        <span className={`inline-flex px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border ${channelBadgeClass(notification.channel)}`}>
                                            {channelLabel}
                                        </span>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <label className="block text-[13px] font-medium text-gray-500 mb-2">
                                        {t('recipient')}
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {recipientOptions.map((opt) => {
                                            const isSelected = selectedRecipientId === opt.id;
                                            return (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => setSelectedRecipientId(opt.id)}
                                                    className={`px-4 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${isSelected
                                                        ? 'bg-[#DCFCE7] text-[#008236] border-[#99E8B5]'
                                                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                                                >
                                                    {opt.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <TemplateBody value={body} onChange={setBody} disabled={isSaving} placeholders={placeholders} />
                            </>
                        )}
                    </div>
                    {canEdit && (
                        <div className="bg-white p-4 px-6 border-t border-gray-200 flex justify-end items-center gap-3">
                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={isSaving}
                                className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isSaving}
                                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-[#16A34A] rounded-lg hover:bg-[#10883c] transition-colors disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>{t('saving')}</span>
                                    </>
                                ) : (
                                    <>
                                        <FileText className="w-4 h-4" />
                                        <span>{t('saveTemplate')}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
