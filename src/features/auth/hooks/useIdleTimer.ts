'use client';

import { sendHeartbeat } from '@/features/auth/api/authApi';
import { performLogout } from '@/features/auth/logout';
import { selectUser } from '@/features/auth/store/authSlice';
import { CLIENT_IDLE_TIMEOUT_MS, CLIENT_IDLE_WARNING_LEAD_MS } from '@/lib/idleTimeoutConfig';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const;

// Real activity is common (a mouse resting on the window fires `mousemove`
// constantly); pinging the server on every single event would defeat the
// point of a lightweight keep-alive. This just needs to comfortably beat the
// warning lead time, not track activity precisely.
const HEARTBEAT_THROTTLE_MS = 60_000;

export interface IdleTimerState {
  /** Whether the "you're about to be signed out" modal should be shown. */
  warning: boolean;
  /** Only meaningful while `warning` is true. */
  secondsRemaining: number;
  /** Dismisses the warning and resets the idle clock — the modal's "Stay signed in" action. */
  stayActive: () => void;
}

/**
 * Client-side half of the idle-session timeout; `idleSession.ts` /
 * `proxy.ts` are the half that actually enforces it server-side even if this
 * never runs (JS disabled, tab frozen, etc.). This exists purely to warn the
 * user before that happens and to end the session gracefully instead of
 * their next click just bouncing them to `/login` with no explanation.
 */
export function useIdleTimer(): IdleTimerState {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const userEmail = useAppSelector(selectUser)?.email ?? null;

  const [warning, setWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(Math.ceil(CLIENT_IDLE_WARNING_LEAD_MS / 1000));

  // Seeded from an effect, not here: render must stay pure, and `Date.now()`
  // isn't. Both start at 0 for one render and are set to the real mount time
  // as soon as the activity-listener effect below runs, well before the
  // 1-second interval ever gets a chance to read them.
  const lastActivityRef = useRef(0);
  const lastHeartbeatRef = useRef(0);
  const loggedOutRef = useRef(false);

  const signOutForIdle = useCallback(() => {
    // Awaited, not fired-and-forgotten: `performLogout` is what clears the
    // session cookies server-side, and the navigation below re-enters
    // `proxy.ts`. Racing them would let a still-valid cookie pair get this
    // "logged out" user's session silently restored by `AuthBootstrapGate`
    // on the very page meant to end it.
    void (async () => {
      const currentUrl = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '';
      await performLogout(dispatch, userEmail);
      const returnParam = currentUrl && !currentUrl.startsWith('/login') ? `&returnUrl=${encodeURIComponent(currentUrl)}` : '';
      router.push(`/login?reason=idle${returnParam}`);
    })();
  }, [dispatch, router, userEmail]);

  const recordActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    if (now - lastHeartbeatRef.current >= HEARTBEAT_THROTTLE_MS) {
      lastHeartbeatRef.current = now;
      void sendHeartbeat();
    }
  }, []);

  const stayActive = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    lastHeartbeatRef.current = now;
    setWarning(false);
    void sendHeartbeat();
  }, []);

  useEffect(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    lastHeartbeatRef.current = now;

    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, recordActivity, { passive: true }));
    return () => ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, recordActivity));
  }, [recordActivity]);

  useEffect(() => {
    const warnAtMs = CLIENT_IDLE_TIMEOUT_MS - CLIENT_IDLE_WARNING_LEAD_MS;

    const tick = window.setInterval(() => {
      if (loggedOutRef.current) return;
      const idleForMs = Date.now() - lastActivityRef.current;

      if (idleForMs >= CLIENT_IDLE_TIMEOUT_MS) {
        loggedOutRef.current = true;
        signOutForIdle();
        return;
      }

      if (idleForMs >= warnAtMs) {
        setWarning(true);
        setSecondsRemaining(Math.max(0, Math.ceil((CLIENT_IDLE_TIMEOUT_MS - idleForMs) / 1000)));
      } else {
        setWarning(false);
      }
    }, 1000);

    return () => window.clearInterval(tick);
  }, [signOutForIdle]);

  return { warning, secondsRemaining, stayActive };
}
