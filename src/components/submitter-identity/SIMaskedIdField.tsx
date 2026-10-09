"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { INVALID_INPUT_STYLES } from "@/components/ui/FieldError";

interface SIMaskedIdFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Lets a `<label htmlFor>` and the form's focus-first-error step find this input. */
  id?: string;
  invalid?: boolean;
  /** The id of the error message shown for this field, wired up as `aria-describedby`. */
  describedBy?: string;
  onBlur?: () => void;
}

/**
 * A national-ID input (Fayda ID and its per-type variants) — masked by
 * default like a password field, with an explicit reveal toggle. A
 * government ID number is sensitive enough to warrant the same
 * shoulder-surfing/screen-share protection a password gets, not a plain text
 * input that shows it on screen the moment it's typed.
 */
export function SIMaskedIdField({ value, onChange, placeholder, id, invalid, describedBy, onBlur }: SIMaskedIdFieldProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={revealed ? "text" : "password"}
        autoComplete="off"
        // Caps hand-typing at 16 (the shape FAYDA_PATTERN in fields.ts
        // requires from someone typing their own ID). A signed-in account's
        // own Fayda ID can come back longer, in the backend's issued shape
        // (letters and hyphens, up to 60 chars — see ISSUED_FAYDA_ID_PATTERN)
        // — but `maxLength` only constrains what the user can type, not a
        // longer value set programmatically by a prefill, so capping it here
        // doesn't truncate that case; it only stops someone hand-typing past
        // the 16 digits the pattern actually accepts (this was 60 before,
        // which let the Register screen's brand-new, never-prefilled field
        // accept far more than a valid Fayda ID's length).
        maxLength={16}
        value={value}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Enter ID number"}
        className={`w-full bg-white border border-gray-300 text-gray-700 py-2.5 pl-4 pr-11 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b8535]/20 focus:border-[#0b8535] text-sm transition-colors shadow-sm ${INVALID_INPUT_STYLES}`}
      />
      <button
        type="button"
        onClick={() => setRevealed((prev) => !prev)}
        aria-label={revealed ? "Hide ID number" : "Show ID number"}
        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
      >
        {revealed ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}
