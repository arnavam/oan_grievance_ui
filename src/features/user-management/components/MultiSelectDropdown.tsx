'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

interface MultiSelectDropdownProps {
  id?: string;
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  /** Shown instead of the options when there are none to pick. */
  emptyLabel: string;
  /** What the trigger says when several are ticked, so a long pick never stretches it. */
  summarize: (count: number) => string;
  disabled?: boolean;
}

/**
 * A dropdown that stays open while several options are ticked. Same trigger styling and
 * keyboard behaviour as `AnimatedSelect` (real buttons, Escape closes and returns focus).
 */
export function MultiSelectDropdown({ id, options, values, onChange, placeholder, emptyLabel, summarize, disabled }: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onMouseDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const toggle = (value: string) =>
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  const summary = values.length === 0 ? '' : values.length === 1 ? values[0] : summarize(values.length);
  const listboxId = id ? `${id}-listbox` : undefined;
  const open = isOpen && !disabled;

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full border rounded-lg px-4 py-2.5 text-sm text-left flex justify-between items-center gap-2 transition-all duration-200 focus:outline-none focus:ring-1 disabled:bg-gray-50 disabled:cursor-not-allowed ${
          open ? 'border-[#16A34A] ring-1 ring-[#16A34A]' : 'border-gray-200 hover:border-gray-300 focus:border-[#16A34A] focus:ring-[#16A34A]'
        }`}
      >
        <span className={`truncate ${summary ? 'text-gray-700' : 'text-gray-400'}`}>{summary || placeholder}</span>
        <ChevronDown size={16} className={`shrink-0 text-gray-500 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 w-full top-full mt-2 bg-white border border-gray-100 rounded-lg shadow-xl overflow-hidden">
          {options.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400">{emptyLabel}</p>
          ) : (
            <ul id={listboxId} role="listbox" aria-multiselectable="true" aria-label={placeholder} className="max-h-60 overflow-auto py-1">
              {options.map((option) => {
                const selected = values.includes(option);
                return (
                  <li key={option} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => toggle(option)}
                      className={`w-full px-4 py-2.5 text-sm text-left flex items-center gap-2 transition-colors ${
                        selected ? 'bg-[#16A34A]/10 text-[#16A34A] font-medium' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className={`flex h-4 w-4 items-center justify-center rounded border ${selected ? 'bg-[#16A34A] border-[#16A34A]' : 'border-gray-300'}`}>
                        {selected && <Check size={12} className="text-white" aria-hidden="true" />}
                      </span>
                      {option}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
