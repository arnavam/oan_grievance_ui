'use client';

import { useEffect, useState } from 'react';
import { fetchOfficers } from '../api/officerApi';
import type { OfficerLevel } from '../types';

/**
 * The true total officer count for `level`, for a tab's `(N)` badge — independent of
 * whether that tab is the active one. `useOfficerList` only fetches for the active tab
 * (the right call for its heavier list+stats data), so without this a tab you haven't
 * clicked into yet would have nothing to show its badge except the old dummy count.
 * `null` while unresolved, so the caller can render nothing rather than a wrong number.
 */
export function useOfficerCount(level: OfficerLevel): number | null {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchOfficers({ level, page: 1, page_size: 1 }, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        setCount(data.pagination?.total_count ?? null);
      })
      .catch(() => {
        if (!controller.signal.aborted) setCount(null);
      });
    return () => controller.abort();
  }, [level]);

  return count;
}
