/** The message shown directly under a field that failed validation. */
export function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-1.5 text-[12px] font-medium text-red-600">
      {children}
    </p>
  );
}

/**
 * Turns a text input's border and focus ring red while it has
 * `aria-invalid="true"`. Keyed off the attribute rather than swapped in
 * conditionally so it wins over each form's own border classes regardless of
 * how they're written — append it to the input's className and set
 * `aria-invalid` from the field's error.
 */
export const INVALID_INPUT_STYLES =
  'aria-invalid:border-red-500 aria-invalid:focus:border-red-500 aria-invalid:focus:ring-red-500/20';

/** The id a field's error message gets, for the input's `aria-describedby`. */
export function errorIdFor(fieldId: string): string {
  return `${fieldId}-error`;
}
