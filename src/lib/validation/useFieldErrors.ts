'use client';

import { useCallback, useState } from 'react';

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

/**
 * Per-field error messages for a form: set or clear one field's message
 * (blur, change-after-error), or replace them all at once (submit).
 */
export function useFieldErrors<K extends string>() {
  const [errors, setErrors] = useState<FieldErrors<K>>({});

  const setError = useCallback((key: K, message: string | null) => {
    setErrors((prev) => {
      if ((prev[key] ?? null) === message) return prev;
      const next = { ...prev };
      if (message) next[key] = message;
      else delete next[key];
      return next;
    });
  }, []);

  const setAll = useCallback((next: FieldErrors<K>) => setErrors(next), []);

  return { errors, setError, setAll };
}

/**
 * Focuses the first field, in form order, that has an error — so after a
 * failed submit the person lands on the first thing to fix rather than
 * hunting for it.
 */
export function focusFirstError<K extends string>(
  order: ReadonlyArray<{ key: K; id: string }>,
  errors: FieldErrors<K>
): void {
  const first = order.find(({ key }) => errors[key]);
  if (first) document.getElementById(first.id)?.focus();
}
