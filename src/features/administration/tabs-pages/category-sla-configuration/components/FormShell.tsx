"use client";

import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export const inputClass = (hasError?: boolean) =>
  `w-full border rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none transition-colors disabled:bg-gray-50 disabled:text-gray-500 ${
    hasError
      ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
      : 'border-gray-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
  }`;

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: (id: string, describedBy: string | undefined) => React.ReactNode;
}

/** A labelled control whose hint and error are tied to it via aria-describedby. */
export function Field({ label, required, error, hint, children }: FieldProps) {
  const id = useId();
  const noteId = `${id}-note`;
  const note = error ?? hint;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-gray-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      {children(id, note ? noteId : undefined)}
      {note && (
        <p id={noteId} className={`text-xs ${error ? 'text-red-600' : 'text-gray-500'}`}>
          {note}
        </p>
      )}
    </div>
  );
}

interface FormShellProps {
  title: string;
  closeLabel: string;
  onClose: () => void;
  /** A wider frame, for a two-column form. */
  wide?: boolean;
  children: React.ReactNode;
}

/** The modal frame: Escape and backdrop click close it. */
export function FormShell({ title, closeLabel, onClose, wide = false, children }: FormShellProps) {
  const titleId = useId();
  // Held in a ref so an inline `onClose` doesn't re-run the mount effect.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 id={titleId} className="text-lg font-bold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
