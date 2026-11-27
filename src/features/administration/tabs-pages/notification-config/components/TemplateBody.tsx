"use client";

import { useRef } from 'react';
import { Tag } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { PlaceholderItem } from './types';
import { placeholderToken } from '../utils/placeholders';

function placeholderTitle(placeholder: PlaceholderItem, exampleLabel: (example: string) => string): string {
    return `${placeholder.label}: ${placeholder.description || ''}${placeholder.example ? ` (${exampleLabel(placeholder.example)})` : ''}`;
}

// Matches {ticket_number} but leaves Jinja syntax such as {{ x }} and {% if x %} as text.
const PLACEHOLDER_TOKEN = /((?<!\{)\{\w+\}(?!\}))/;

/** Read-only template text, with each placeholder marked up instead of printed raw. */
export function TemplateText({ value, placeholders = [] }: { value: string; placeholders?: PlaceholderItem[] }) {
    const t = useTranslations('admin.notifications');
    if (!value) return <p className="text-[14px] text-gray-800">—</p>;

    const allPlaceholders = placeholders;
    const exampleLabel = (example: string) => t('placeholderExample', { example });

    return (
        <p className="text-[14px] text-gray-800 leading-relaxed whitespace-pre-wrap">
            {value.split(PLACEHOLDER_TOKEN).map((part, index) => {
                if (index % 2 === 0) return part;
                const placeholder = allPlaceholders.find((v) => placeholderToken(v) === part);
                return (
                    <span
                        key={index}
                        className="inline-flex px-1.5 rounded-md text-[12px] font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200"
                        title={placeholder ? placeholderTitle(placeholder, exampleLabel) : undefined}
                    >
                        {part}
                    </span>
                );
            })}
        </p>
    );
}

interface TemplateBodyProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    placeholders?: PlaceholderItem[];
}

export function TemplateBody({ value, onChange, disabled = false, placeholders = [] }: TemplateBodyProps) {
    const t = useTranslations('admin.notifications');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const allPlaceholders = placeholders;
    const exampleLabel = (example: string) => t('placeholderExample', { example });

    const handleInsert = (variableKey: string) => {
        if (disabled) return;
        const textarea = textareaRef.current;
        const isFocused = typeof document !== 'undefined' && document.activeElement === textarea;

        if (textarea && isFocused) {
            const start = textarea.selectionStart ?? value.length;
            const end = textarea.selectionEnd ?? value.length;
            const before = value.substring(0, start);
            const after = value.substring(end);
            const nextValue = `${before}${variableKey}${after}`;
            onChange(nextValue);

            requestAnimationFrame(() => {
                textarea.focus();
                const nextCursor = start + variableKey.length;
                textarea.setSelectionRange(nextCursor, nextCursor);
            });
        } else {
            const nextValue = value ? `${value} ${variableKey}` : variableKey;
            onChange(nextValue);
            requestAnimationFrame(() => {
                textarea?.focus();
            });
        }
    };

    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
                <label className="block text-[13px] font-medium text-gray-500">
                    {t('templateBody')}
                </label>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Tag className="w-3 h-3" />
                    <span>{t('clickToInsert')}</span>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mb-3">
                {allPlaceholders.length === 0 && (
                    <span className="text-xs text-gray-400">{t('noVariables')}</span>
                )}
                {allPlaceholders.map((v) => {
                    const token = placeholderToken(v);
                    return (
                        <button
                            key={token}
                            type="button"
                            onClick={() => handleInsert(token)}
                            disabled={disabled}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-900 border border-blue-200 transition-colors disabled:opacity-50"
                            title={placeholderTitle(v, exampleLabel)}
                        >
                            <span>{token}</span>
                        </button>
                    );
                })}
            </div>

            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="w-full bg-white border border-gray-200 rounded-lg p-4 text-[14px] text-gray-700 min-h-48 focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A] resize-y leading-relaxed disabled:bg-gray-50 disabled:text-gray-400"
                placeholder={t('bodyPlaceholder')}
            />
        </div>
    );
}

