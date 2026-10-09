'use client';

import { useEffect } from 'react';
import { selectIsAuthenticated } from '@/features/auth/store/authSlice';
import { connectRealtime, disconnectRealtime } from '@/lib/realtime';
import { useAppSelector } from '@/store/hooks';

/**
 * Mounted once in the authenticated shell (`(dashboard)/layout.tsx`). Holds
 * the realtime socket open while a user is signed in and closes it when the
 * session ends, so a signed-out tab never keeps receiving events.
 */
export function RealtimeConnection() {
  const signedIn = useAppSelector(selectIsAuthenticated);

  useEffect(() => {
    if (!signedIn) return;
    connectRealtime();
    return () => disconnectRealtime();
  }, [signedIn]);

  return null;
}
