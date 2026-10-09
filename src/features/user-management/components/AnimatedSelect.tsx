'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface AnimatedSelectProps {
  /** A plain string is shorthand for `{ value: s, label: s }`. */
  options: Array<string | SelectOption>;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Associates the trigger with an external `<label>` — same role `id`/`htmlFor` plays on a native input. */
  id?: string;
}

function normalize(option: string | SelectOption): SelectOption {
  return typeof option === 'string' ? { value: option, label: option } : option;
}

/**
 * A real `<button>` trigger and `<button role="option">` list items — matching the
 * accessible-dropdown bar `PhoneField` already established in this codebase (keyboard-
 * focusable and operable by Enter/Space natively, unlike a clickable `<div>`/`<li>`), plus
 * Escape-to-close and returning focus to the trigger, which `PhoneField` doesn't have either.
 */
export function AnimatedSelect({ options, value, onChange, placeholder, id }: AnimatedSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const normalized = options.map(normalize);
  const selectedLabel = normalized.find((opt) => opt.value === value)?.label;
  const listboxId = id ? `${id}-listbox` : undefined;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full border rounded-lg px-4 py-2.5 text-sm text-left transition-all duration-200 cursor-pointer flex justify-between items-center focus:outline-none focus:ring-1 ${isOpen ? 'border-[#16A34A] ring-1 ring-[#16A34A]' : 'border-gray-200 hover:border-gray-300 focus:border-[#16A34A] focus:ring-[#16A34A]'
          }`}
      >
        <span className={selectedLabel ? 'text-gray-700' : 'text-gray-400'}>{selectedLabel || placeholder}</span>
        <ChevronDown size={16} className={`text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full top-full mt-2 bg-white border border-gray-100 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <ul id={listboxId} role="listbox" aria-label={placeholder} className="max-h-60 overflow-auto py-1">
            {normalized.map((opt) => (
              <li key={opt.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={value === opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className={`w-full px-4 py-2.5 text-sm text-left cursor-pointer transition-colors ${value === opt.value
                    ? 'bg-[#16A34A]/10 text-[#16A34A] font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  {opt.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
