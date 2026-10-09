'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Copies `text` to the clipboard and flips `isCopied` true for 2s to drive a checkmark icon.
 * Tracks the pending timeout in a ref so a rapid second copy restarts the window instead of
 * stacking, and clears it on unmount — without this a modal closed inside that 2s window
 * calls `setState` on an unmounted component.
 */
export function useCopyFeedback() {
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Clipboard access can be denied/unavailable — the password is still visible to copy by hand.
    }
  };

  const reset = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsCopied(false);
  };

  return { isCopied, copy, reset };
}
