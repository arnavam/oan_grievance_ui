"use client";

import { useId } from "react";
import { Star } from "lucide-react";

export interface StarRatingProps {
  /** Visible legend for the group. */
  label: string;
  /** Accessible name of each option, e.g. `n => "3 of 5 stars"`. */
  optionLabel: (value: number) => string;
  value: number | null;
  onChange: (value: number) => void;
  max?: number;
  required?: boolean;
  disabled?: boolean;
  /** Id of an element describing the group, such as its error message. */
  describedBy?: string;
}

/**
 * A 1..max star picker built on a native radio group, so arrow keys, Tab and
 * screen readers work without custom key handling. The radios are visually
 * hidden; each star is the radio's label.
 */
export function StarRating({
  label,
  optionLabel,
  value,
  onChange,
  max = 5,
  required = false,
  disabled = false,
  describedBy,
}: StarRatingProps) {
  const name = useId();

  return (
    <fieldset aria-describedby={describedBy} disabled={disabled} className="min-w-0">
      <legend className="block text-sm font-bold text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500" aria-hidden="true">*</span>}
      </legend>
      <div className="flex items-center gap-1">
        {Array.from({ length: max }, (_, index) => {
          const starValue = index + 1;
          const filled = value !== null && starValue <= value;
          const id = `${name}-${starValue}`;
          return (
            <span key={starValue}>
              <input
                id={id}
                type="radio"
                name={name}
                value={starValue}
                checked={value === starValue}
                required={required}
                onChange={() => onChange(starValue)}
                className="peer sr-only"
              />
              <label
                htmlFor={id}
                className="block cursor-pointer rounded p-0.5 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500 peer-disabled:cursor-not-allowed"
              >
                <Star
                  aria-hidden="true"
                  className={`h-7 w-7 transition-colors ${
                    filled ? "fill-amber-400 text-amber-400" : "fill-transparent text-gray-300 hover:text-amber-300"
                  }`}
                />
                <span className="sr-only">{optionLabel(starValue)}</span>
              </label>
            </span>
          );
        })}
      </div>
    </fieldset>
  );
}
