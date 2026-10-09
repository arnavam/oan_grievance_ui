'use client';

import { useEffect, useState } from 'react';
import { fetchOfficers } from '../api/officerApi';
import type { OfficerBackendStatus, OfficerLevel } from '../types';

export interface OfficerStatusCounts {
  active: number;
  onLeave: number;
  inactive: number;
}

const ZERO_COUNTS: OfficerStatusCounts = { active: 0, onLeave: 0, inactive: 0 };

async function fetchStatusTotal(
  level: OfficerLevel,
  status: OfficerBackendStatus,
  signal: AbortSignal
): Promise<number> {
  const data = await fetchOfficers({ level, status, page: 1, page_size: 1 }, { signal });
  return data.pagination?.total_count ?? 0;
}

/**
 * The true Active/On Leave/Inactive breakdown for `level`, across every officer on every
 * page — not just the page currently displayed. Three `page_size: 1` requests (one per
 * status) each read `pagination.total_count`, the same trick `useOfficerCount` uses for a
 * tab's overall badge, rather than counting the rows already in hand client-side.
 *
 * `enabled` lets the caller skip the three requests entirely while a non-API (dummy) tab
 * is active — `level` is meaningless there, so there is nothing real to fetch.
 */
export function useOfficerStatusCounts(level: OfficerLevel, enabled: boolean): OfficerStatusCounts {
  // Only ever set from the fetch's own then/catch below, never reset directly for the
  // `!enabled` case — that keeps this hook from needing a setState call in the effect's
  // early-return branch (see useWiredCategoryOptions for the same shape).
  const [fetchedCounts, setFetchedCounts] = useState<OfficerStatusCounts>(ZERO_COUNTS);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    Promise.all([
      fetchStatusTotal(level, 'Active', controller.signal),
      fetchStatusTotal(level, 'On Leave', controller.signal),
      fetchStatusTotal(level, 'Inactive', controller.signal),
    ])
      .then(([active, onLeave, inactive]) => {
        if (controller.signal.aborted) return;
        setFetchedCounts({ active, onLeave, inactive });
      })
      .catch(() => {
        if (!controller.signal.aborted) setFetchedCounts(ZERO_COUNTS);
      });
    return () => controller.abort();
  }, [level, enabled]);

  return enabled ? fetchedCounts : ZERO_COUNTS;
}
