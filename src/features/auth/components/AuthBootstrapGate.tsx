'use client';

import { isProtectedRoute } from '@/features/auth/rbac';
import { getMeThunk, selectAuthStatus } from '@/features/auth/store/authSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * Holds the first paint of a dashboard screen until the session has been
 * restored from the httpOnly cookie via `/api/auth/me`, and starts that
 * restore. Only protected routes are probed — the login/register screens have
 * no session cookie by definition, so asking there is pure noise.
 */
export function AuthBootstrapGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectAuthStatus);

  const isRestoring = status === 'idle' || status === 'loading';
  const onProtectedRoute = isProtectedRoute(pathname);
  const needsRestore = onProtectedRoute && status === 'idle';

  // Guards against React's double-invoked effect on mount firing two restores.
  const restoreRequested = useRef(false);

  useEffect(() => {
    if (!needsRestore) {
      if (!onProtectedRoute) restoreRequested.current = false;
      return;
    }
    if (restoreRequested.current) return;
    restoreRequested.current = true;
    void dispatch(getMeThunk());
  }, [dispatch, needsRestore, onProtectedRoute]);

  if (onProtectedRoute && isRestoring) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-gray-50">
        <p className="text-sm font-semibold text-gray-500">Restoring your session…</p>
      </div>
    );
  }

  return <>{children}</>;
}
