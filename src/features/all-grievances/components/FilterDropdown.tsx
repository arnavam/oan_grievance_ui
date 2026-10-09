'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/** A selectable filter value: `value` goes to the API, `label` is shown to the user. */
export interface FilterOption {
  value: string;
  label: string;
}

export function FilterDropdown({
  label,
  options,
  selected,
  onChange,
  isLoading = false,
  disabled = false,
  disabledMessage,
  search,
  note,
}: {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (val: string[]) => void;
  isLoading?: boolean;
  disabled?: boolean;
  disabledMessage?: string;
  /** Renders a search box above the options; the caller does the filtering (typically server-side). */
  search?: { value: string; onChange: (value: string) => void };
  /** A line under the options, e.g. that the list is truncated. */
  note?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Deduplicate options by value
  const uniqueOptions = React.useMemo(() => {
    const seen = new Set<string>();
    const result: FilterOption[] = [];
    for (const opt of options) {
      if (opt.value && !seen.has(opt.value)) {
        seen.add(opt.value);
        result.push(opt);
      }
    }
    return result;
  }, [options]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtering happens server-side, where "no values" means "no constraint" — so an
  // empty selection is exactly what "All" means, and ticking All just clears it.
  const isAllSelected = selected.length === 0;

  const handleToggleAll = () => {
    onChange([]);
  };

  const handleToggle = (value: string, checked: boolean) => {
    if (checked) {
      onChange([...selected, value]);
    } else {
      onChange(selected.filter((v) => v !== value));
    }
  };

  const selectedLabels = selected
    .map(val => uniqueOptions.find(opt => opt.value === val)?.label || val)
    .join(', ');

  const summary = isLoading
    ? 'Loading…'
    : disabled && disabledMessage
      ? disabledMessage
      : selected.length > 0
        ? selectedLabels
        : `Select ${label}`;

  return (
    <div className="flex flex-col gap-1.5 mb-4 relative" ref={dropdownRef}>
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <div
        className={`flex items-center justify-between px-3 py-2.5 border rounded-lg transition-colors ${
          disabled
            ? 'bg-gray-50 border-gray-100 cursor-not-allowed opacity-70'
            : 'border-gray-200 cursor-pointer bg-white hover:bg-gray-50'
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className="text-sm text-gray-500 line-clamp-1">{summary}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-20 mt-1 border border-gray-100 rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.12)] bg-white overflow-hidden max-h-72 transform origin-top transition-all duration-200 opacity-100 scale-100 flex flex-col">
          {search && (
            <div className="p-2 border-b border-gray-100">
              <input
                type="search"
                aria-label={`Search ${label}`}
                placeholder={`Search ${label.toLowerCase()}…`}
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-[#1E8E3E] focus:ring-2 focus:ring-[#1E8E3E]/20"
              />
            </div>
          )}
          <div className="overflow-y-auto max-h-48">
            {uniqueOptions.length === 0 ? (
              <div className="px-3 py-3 text-sm text-gray-400 text-center">
                {isLoading ? 'Loading options…' : 'No options available'}
              </div>
            ) : (
              [
                { value: '__all__', label: 'All' },
                ...uniqueOptions,
              ].map((option, idx) => {
                const isAllRow = option.value === '__all__';
                const isChecked = isAllRow ? isAllSelected : selected.includes(option.value);
                return (
                  <label
                    key={`${option.value}-${idx}`}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                  >
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        className="peer appearance-none w-[18px] h-[18px] border border-gray-300 rounded-[3px] bg-white checked:bg-[#1E8E3E] checked:border-[#1E8E3E] transition-all duration-200 cursor-pointer"
                        checked={isChecked}
                        onChange={(e) =>
                          isAllRow ? handleToggleAll() : handleToggle(option.value, e.target.checked)
                        }
                      />
                      <svg
                        className={`absolute w-3 h-3 text-white pointer-events-none transition-transform duration-300 ${isChecked ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm text-gray-600 truncate">{option.label}</span>
                  </label>
                );
              })
            )}
          </div>
          {note && <div className="px-3 py-2 text-xs text-gray-400 border-t border-gray-100">{note}</div>}
        </div>
      )}
    </div>
  );
}
