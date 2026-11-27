'use client';

import { useEffect, useState } from 'react';
import { fetchPositions } from '../api/positionApi';
import type { PositionRecord } from '../types';

/** One entry per distinct designation among the positions, in the service's order. */
export function designationsOf(positions: PositionRecord[]): string[] {
  const seen = new Set<string>();
  for (const position of positions) {
    if (!position.active) continue;
    const name = (position.designation || position.position_title || '').trim();
    if (name) seen.add(name);
  }
  return [...seen];
}

/**
 * The designations an officer of `levelCode` can hold, from the service's positions. Empty (so the
 * field is left out) when there are none or the call fails: a designation is optional.
 */
export function useDesignations(enabled: boolean, levelCode: string | undefined): { designations: string[]; isLoading: boolean } {
  const [designations, setDesignations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !levelCode) return;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    fetchPositions({ role_level: levelCode, active: true, page_size: 100 }, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setDesignations(designationsOf(data.positions ?? []));
      })
      .catch(() => {
        if (!controller.signal.aborted) setDesignations([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [enabled, levelCode]);

  return { designations: enabled && levelCode ? designations : [], isLoading };
}
