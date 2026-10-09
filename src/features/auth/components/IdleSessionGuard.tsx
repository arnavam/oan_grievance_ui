'use client';

import { Button } from '@/components/ui/Button';
import { useIdleTimer } from '@/features/auth/hooks/useIdleTimer';

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Mounted once in the authenticated shell (`(dashboard)/layout.tsx`). Renders
 * nothing until `useIdleTimer` flags the user as about to be signed out for
 * inactivity, then shows a countdown modal offering to stay signed in.
 */
export function IdleSessionGuard() {
  const { warning, secondsRemaining, stayActive } = useIdleTimer();

  if (!warning) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="idle-warning-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4"
    >
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 id="idle-warning-title" className="text-lg font-bold text-gray-900">
          Still there?
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          You&apos;ve been inactive for a while. For your security, you&apos;ll be signed out in{' '}
          <span className="font-semibold text-gray-900">{formatCountdown(secondsRemaining)}</span> unless you stay
          signed in.
        </p>
        <div className="mt-6 flex justify-end">
          <Button type="button" size="md" onClick={stayActive}>
            Stay signed in
          </Button>
        </div>
      </div>
    </div>
  );
}
