"use client";

import { useCallback, useState } from "react";
import { focusFirstError } from "@/lib/validation/useFieldErrors";
import { DEFAULT_REQUIRED_MESSAGE, getFieldError, getFieldErrors, SI_FIELDS_BY_TYPE } from "./fields";
import { siFieldId } from "./SI-fields";

/** A field that sits outside the identity form itself (e.g. the submitter-type or channel dropdown). */
export interface ExtraFieldCheck {
  key: string;
  /** DOM id to focus if this is the first invalid field. */
  id: string;
  /** The message to show, or null when the field is fine. */
  message: string | null;
}

interface Options {
  submitterType: string;
  values: Record<string, string>;
  hiddenFields?: readonly string[];
  /** Translated "this field is required" wording, if the caller has one. */
  requiredMessage?: string;
}

/**
 * Inline validation state for a submitter-identity form, shared by the
 * register profile step and Submit Grievance's Step 1 so both apply the same
 * rules the same way: check a field when it loses focus, re-check one that is
 * already showing an error as it's edited (so the message clears the moment
 * it's fixed), and check everything on submit.
 */
export interface UseIdentityErrorsResult {
  errors: Record<string, string>;
  setError: (key: string, message: string | null) => void;
  validateField: (key: string, nextValues?: Record<string, string>) => void;
  validateAll: (extra?: ExtraFieldCheck[]) => boolean;
  revalidateIfShowing: (key: string, nextValue: string) => void;
  clear: () => void;
}

export function useIdentityErrors({
  submitterType,
  values,
  hiddenFields = [],
  requiredMessage = DEFAULT_REQUIRED_MESSAGE,
}: Options): UseIdentityErrorsResult {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setError = useCallback((key: string, message: string | null) => {
    setErrors((prev) => {
      if ((prev[key] ?? null) === message) return prev;
      const next = { ...prev };
      if (message) next[key] = message;
      else delete next[key];
      return next;
    });
  }, []);

  /** Checks one identity field against `nextValues` (defaults to the current ones). */
  const validateField = (key: string, nextValues: Record<string, string> = values) => {
    setError(key, getFieldError(submitterType, key, nextValues, hiddenFields, requiredMessage));
  };

  /**
   * Checks the whole form. Returns true when nothing is wrong; otherwise shows
   * every message and moves focus to the first invalid field, in form order
   * (`extra` fields first, then the type's own).
   */
  const validateAll = (extra: ExtraFieldCheck[] = []): boolean => {
    const next: Record<string, string> = {};
    for (const check of extra) if (check.message) next[check.key] = check.message;
    Object.assign(next, getFieldErrors(submitterType, values, hiddenFields, requiredMessage));
    setErrors(next);

    focusFirstError(
      [
        ...extra.map(({ key, id }) => ({ key, id })),
        ...(SI_FIELDS_BY_TYPE[submitterType] ?? []).map(({ key }) => ({ key, id: siFieldId(key) })),
      ],
      next
    );
    return Object.keys(next).length === 0;
  };

  /** Call as a field changes: if it is showing an error, re-check it against the new value. */
  const revalidateIfShowing = (key: string, nextValue: string) => {
    if (errors[key]) validateField(key, { ...values, [key]: nextValue });
  };

  const clear = useCallback(() => setErrors({}), []);

  return { errors, setError, validateField, validateAll, revalidateIfShowing, clear };
}
