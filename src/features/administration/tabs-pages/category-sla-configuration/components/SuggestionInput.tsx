"use client";

import { useId, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { inputClass } from './FormShell';

interface SuggestionInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Values offered as the user types; any other text is still accepted. */
  suggestions: readonly string[];
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}

/**
 * A dropdown that also takes typed text, styled like the app's other
 * dropdowns (chevron on the right, a rounded list directly below with the
 * chosen option tinted green). Used where a value usually comes from an
 * existing list but may be new. Follows the ARIA combobox pattern: arrow keys
 * move through the list, Enter picks, Escape closes.
 */
export function SuggestionInput({
  id,
  value,
  onChange,
  suggestions,
  placeholder,
  invalid,
  describedBy,
  inputRef,
}: SuggestionInputProps) {
  const listId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const matches = useMemo(() => {
    const needle = value.trim().toLowerCase();
    return suggestions.filter((s) => !needle || s.toLowerCase().includes(needle));
  }, [suggestions, value]);
  const showList = isOpen && matches.length > 0;

  const pick = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setActive(-1);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setActive((i) => (i + 1) % Math.max(matches.length, 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      setActive((i) => (i <= 0 ? matches.length - 1 : i - 1));
    } else if (event.key === 'Enter' && showList && active >= 0) {
      // Picking a suggestion must not also submit the form.
      event.preventDefault();
      const option = matches[active];
      if (option) pick(option);
    } else if (event.key === 'Escape' && showList) {
      // Close the list only; the modal's own Escape handler would otherwise close the whole dialog.
      event.stopPropagation();
      event.nativeEvent.stopImmediatePropagation();
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <input
        id={id}
        ref={inputRef}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
          setActive(-1);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onKeyDown={onKeyDown}
        className={`${inputClass(invalid)} pr-10`}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        // mousedown, not click: the input's blur would close the list first.
        onMouseDown={(e) => {
          e.preventDefault();
          setIsOpen((open) => !open);
        }}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-gray-400"
      >
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showList ? 'rotate-180' : ''}`} />
      </button>
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[220px] overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg [scrollbar-color:#16A34A_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#16A34A] [&::-webkit-scrollbar-thumb]:rounded-full"
        >
          {matches.map((option, index) => (
            <li
              key={option}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={option === value}
              // mousedown, not click: the input's blur would close the list before a click lands.
              onMouseDown={(e) => {
                e.preventDefault();
                pick(option);
              }}
              onMouseEnter={() => setActive(index)}
              className={`cursor-pointer px-4 py-2.5 text-[15px] transition-colors ${
                option === value
                  ? 'bg-[#F0FDF4] font-medium text-[#16A34A]'
                  : index === active
                    ? 'bg-gray-50 text-[#4B5563]'
                    : 'text-[#4B5563] hover:bg-gray-50'
              }`}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
