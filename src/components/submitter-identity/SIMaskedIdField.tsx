"use client";

import { useState, useSyncExternalStore } from "react";
import { Eye, EyeOff } from "lucide-react";
import { INVALID_INPUT_STYLES } from "@/components/ui/FieldError";
import { maskIdKeepLast4 } from "@/lib/maskId";

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
  /** Shown, and still maskable with the eye toggle, but not editable. */
  readOnly?: boolean;
}

const subscribeNever = () => () => {};

/**
 * Whether this browser can mask a text input with CSS (`-webkit-text-security`: Chromium, Safari and
 * recent Firefox). Read after hydration; the server and first client render say "no", which is the safe answer.
 */
function canMaskWithCss(): boolean {
  return typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("-webkit-text-security", "disc");
}

/**
 * A national-ID input (Fayda ID and its per-type variants) — masked by
 * default like a password field, with an explicit reveal toggle. A
 * government ID number is sensitive enough to warrant the same
 * shoulder-surfing/screen-share protection a password gets, not a plain text
 * input that shows it on screen the moment it's typed.
 *
 * Where the browser can mask with CSS the field is a text input, so it is not
 * offered to the password manager ("save password?" on an ID number is wrong).
 * Where it cannot, the field falls back to a real password input: that may prompt
 * to save, but the number is never shown in clear text by accident.
 */
export function SIMaskedIdField({ value, onChange, placeholder, id, invalid, describedBy, onBlur, readOnly }: SIMaskedIdFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const [focused, setFocused] = useState(false);
  const cssMask = useSyncExternalStore(subscribeNever, canMaskWithCss, () => false);

  // At rest the number shows only its last four characters; focusing it (or the eye toggle)
  // swaps to the real value so it can be edited, still hidden by the usual masking.
  const showMasked = !revealed && !focused && value.trim().length > 0;

  return (
    <div className="relative">
      <input
        id={id}
        type={revealed || cssMask ? "text" : "password"}
        autoComplete="off"
        data-1p-ignore
        data-lpignore="true"
        style={cssMask && !revealed ? ({ WebkitTextSecurity: "disc" } as React.CSSProperties) : undefined}
        // Caps hand-typing at 16 (the shape FAYDA_ID_PATTERN in
        // registerSubmitter.ts requires from someone typing their own ID). A
        // signed-in account's own Fayda ID can come back longer, in the
        // backend's issued shape (letters and hyphens, up to 60 chars — see
        // ISSUED_FAYDA_ID_PATTERN) — but `maxLength` only constrains what the
        // user can type, not a longer value set programmatically by a prefill,
        // so capping it here doesn't truncate that case; it only stops someone
        // hand-typing past the 12 or 16 digits the pattern actually accepts
        // (this was 60 before, which let the Register screen's brand-new,
        // never-prefilled field accept far more than a valid Fayda ID's length).
        maxLength={16}
        value={value}
        readOnly={readOnly}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Enter ID number"}
        className={`w-full ${readOnly ? "bg-gray-50 cursor-not-allowed" : "bg-white"} border border-gray-300 py-2.5 pl-4 pr-11 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b8535]/20 focus:border-[#0b8535] text-sm transition-colors shadow-sm ${INVALID_INPUT_STYLES} ${showMasked ? "text-transparent select-none" : readOnly ? "text-gray-500" : "text-gray-700"}`}
      />
      {showMasked && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 right-11 flex items-center overflow-hidden pl-4 text-sm text-gray-700"
        >
          {maskIdKeepLast4(value)}
        </span>
      )}
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
