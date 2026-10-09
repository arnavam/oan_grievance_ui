'use client';

import { useEffect, useRef } from 'react';
import { onRealtimeEvent, type RealtimeEventMap, type RealtimeEventName } from './realtimeClient';

/**
 * Runs `listener` for each `event` while the calling component is mounted.
 * The latest `listener` is always the one called, so callers can pass an
 * inline function without resubscribing on every render.
 */
export function useRealtimeEvent<K extends RealtimeEventName>(
  event: K,
  listener: (payload: RealtimeEventMap[K]) => void
) {
  const listenerRef = useRef(listener);
  useEffect(() => {
    listenerRef.current = listener;
  });

  useEffect(() => onRealtimeEvent(event, (payload) => listenerRef.current(payload)), [event]);
}
