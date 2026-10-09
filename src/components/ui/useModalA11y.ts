'use client';

import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The three things every modal dialog in this app needs and none of the officer-management
 * ones had: Escape closes it, Tab is trapped inside it instead of leaking to the page behind,
 * and focus returns to whatever opened it once it's gone. Pairs with `role="dialog"
 * aria-modal="true"` and `createPortal` on the caller's side — this hook only owns behavior,
 * not markup, so it doesn't presume a particular dialog shell.
 */
export function useModalA11y<T extends HTMLElement>(isOpen: boolean, onClose: () => void) {
  const dialogRef = useRef<T>(null);

  // Callers routinely pass an inline closure (a new reference every render) rather than a
  // `useCallback`-wrapped one. Reading the latest one through a ref — instead of listing
  // `onClose` itself as an effect dependency — keeps the effect below from tearing down and
  // reinstalling on every keystroke in the form; without this, its cleanup's
  // `previouslyFocused?.focus()` would yank focus out of whatever the caller is typing into.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      const first = focusable.at(0);
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  return dialogRef;
}
