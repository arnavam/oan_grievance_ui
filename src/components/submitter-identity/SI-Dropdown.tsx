"use client";

import { useState, useRef, useEffect, useId } from "react";
import { ChevronDown, X } from "lucide-react";

export interface Option {
  value: string;
  label: string;
  id?: string;
}

export interface AnimatedSelectProps {
  options: Option[];
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  searchable?: boolean;
  /** Associates an external `<label htmlFor={id}>` with this control. Falls back to an internally generated id if omitted. */
  id?: string;
  /** Set when an error is showing for this field — points the control at the error's id via aria-describedby. */
  describedBy?: string;
  /** Set when this field has a validation error — surfaces as aria-invalid so assistive tech announces it. */
  invalid?: boolean;
}

/**
 * A searchable combobox, not a native `<select>` — built to the WAI-ARIA
 * combobox pattern (role, aria-expanded/aria-activedescendant, arrow-key +
 * Enter/Escape handling) since a plain input with an onClick is invisible to
 * a screen reader and unusable from a keyboard.
 */
export function AnimatedSelect({
  options,
  placeholder,
  value,
  onChange,
  disabled = false,
  searchable = true,
  id,
  describedBy,
  invalid,
}: AnimatedSelectProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const listboxId = `${controlId}-listbox`;

  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typedQuery, setTypedQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find(
    (opt) =>
      opt.value === value ||
      (Boolean(value) && opt.label.toLowerCase() === value.toLowerCase()) ||
      (Boolean(value) && opt.id?.toLowerCase() === value.toLowerCase())
  );

  // Derived display value: if user is actively typing, show typed query;
  // otherwise, show selected option label (or empty for placeholder).
  const displayValue = isTyping
    ? typedQuery
    : selectedOption
    ? selectedOption.label
    : "";

  // Filter options based on typed query if typing
  const filteredOptions =
    isTyping && typedQuery.trim()
      ? options.filter((opt) => {
          const q = typedQuery.toLowerCase().trim();
          return (
            opt.label.toLowerCase().includes(q) ||
            opt.value.toLowerCase().includes(q)
          );
        })
      : options;

  // Close and reset typing on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsTyping(false);
        setTypedQuery("");
        setHighlightedIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll highlighted element into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.querySelector(
        `[data-index="${highlightedIndex}"]`
      ) as HTMLElement | null;
      activeEl?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setIsTyping(false);
    setTypedQuery("");
    setHighlightedIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setIsTyping(false);
    setTypedQuery("");
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    if (!disabled) {
      setIsOpen(true);
      setIsTyping(false);
      setTypedQuery("");
      setHighlightedIndex(
        selectedOption ? options.findIndex((o) => o.value === value) : -1
      );
      if (searchable) {
        setTimeout(() => {
          inputRef.current?.select();
        }, 0);
      }
    }
  };

  const handleClick = () => {
    if (!disabled && !isOpen) {
      setIsOpen(true);
      setIsTyping(false);
      setTypedQuery("");
      setHighlightedIndex(
        selectedOption ? options.findIndex((o) => o.value === value) : -1
      );
      if (searchable) {
        setTimeout(() => {
          inputRef.current?.select();
        }, 0);
      }
    }
  };

  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    if (isOpen) {
      setIsOpen(false);
      setIsTyping(false);
      setTypedQuery("");
      setHighlightedIndex(-1);
    } else {
      setIsOpen(true);
      setIsTyping(false);
      setTypedQuery("");
      setHighlightedIndex(
        selectedOption ? options.findIndex((o) => o.value === value) : -1
      );
      inputRef.current?.focus();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!searchable) return;
    setIsTyping(true);
    setTypedQuery(e.target.value);
    setHighlightedIndex(0);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else if (filteredOptions.length > 0) {
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(filteredOptions.length - 1);
      } else if (filteredOptions.length > 0) {
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen) {
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightedIndex]!.value);
        } else if (filteredOptions.length > 0) {
          handleSelect(filteredOptions[0]!.value);
        }
      } else {
        setIsOpen(true);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setIsTyping(false);
      setTypedQuery("");
      setHighlightedIndex(-1);
    } else if (e.key === "Tab") {
      setIsOpen(false);
      setIsTyping(false);
      setTypedQuery("");
      setHighlightedIndex(-1);
    }
  };

  return (
    <div
      className={`relative w-full text-sm ${disabled ? "opacity-60" : ""}`}
      ref={wrapperRef}
    >
      {/* Combobox Input Trigger */}
      <div
        className={`w-full relative flex items-center border rounded-lg transition-all duration-200 shadow-sm ${
          disabled
            ? "bg-gray-50 border-gray-200 cursor-not-allowed text-gray-400"
            : isOpen
            ? "bg-white border-[#0b8535] ring-2 ring-[#0b8535]/20"
            : "bg-white border-gray-300 hover:border-gray-400"
        }`}
      >
        <input
          ref={inputRef}
          id={controlId}
          type="text"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={
            isOpen && highlightedIndex >= 0 ? `${listboxId}-option-${highlightedIndex}` : undefined
          }
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          readOnly={!searchable}
          value={displayValue}
          placeholder={placeholder}
          onFocus={handleFocus}
          onClick={handleClick}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
          className={`w-full py-2.5 pl-4 pr-14 rounded-lg text-sm bg-transparent outline-none transition-colors ${
            disabled
              ? "cursor-not-allowed text-gray-400"
              : !searchable
              ? "cursor-pointer text-gray-800"
              : "cursor-text text-gray-800"
          } placeholder:text-[#6B7280]`}
        />

        {/* Action buttons (Clear & Chevron) */}
        <div className="absolute right-3 flex items-center gap-1.5">
          {!disabled && Boolean(value) && (
            <button
              type="button"
              tabIndex={-1}
              onClick={handleClear}
              aria-label="Clear selection"
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={handleChevronClick}
            aria-label={isOpen ? "Close menu" : "Open menu"}
            className="p-1 text-gray-500 hover:text-gray-700 rounded transition-colors disabled:cursor-not-allowed"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Dropdown Options Popup */}
      {!disabled && (
        <div
          className={`absolute top-full left-0 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 z-50 overflow-hidden transition-all duration-200 origin-top ${
            isOpen
              ? "opacity-100 scale-y-100 pointer-events-auto"
              : "opacity-0 scale-y-95 pointer-events-none"
          }`}
        >
          <ul id={listboxId} role="listbox" aria-label={placeholder} ref={listRef} className="max-h-60 overflow-y-auto py-1">
            {/* Show reset to placeholder option when not typing */}
            {!isTyping && (
              <li
                role="option"
                aria-selected={!value}
                className={`px-4 py-2.5 cursor-pointer text-[#4B5563] hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                  !value ? "bg-[#f4f8f5] text-[#0b8535] font-semibold" : ""
                }`}
                onClick={() => handleSelect("")}
              >
                {placeholder}
              </li>
            )}

            {filteredOptions.length === 0 ? (
              <li className="px-4 py-3 text-xs text-gray-400 text-center">
                No matching options found
              </li>
            ) : (
              filteredOptions.map((option, idx) => {
                const isSelected = value === option.value;
                const isHighlighted = highlightedIndex === idx;
                return (
                  <li
                    key={`${option.value}-${idx}`}
                    id={`${listboxId}-option-${idx}`}
                    role="option"
                    aria-selected={isSelected}
                    data-index={idx}
                    className={`px-4 py-2.5 cursor-pointer text-[#4B5563] hover:bg-gray-50 transition-colors ${
                      idx !== filteredOptions.length - 1 ? "border-b border-gray-100" : ""
                    } ${
                      isSelected ? "bg-[#f4f8f5] text-[#0b8535] font-semibold" : ""
                    } ${
                      isHighlighted && !isSelected ? "bg-gray-100 text-gray-900" : ""
                    }`}
                    onClick={() => handleSelect(option.value)}
                  >
                    {option.label}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
