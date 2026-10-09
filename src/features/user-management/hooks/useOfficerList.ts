'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { fetchOfficerStatistics, fetchOfficers } from '../api/officerApi';
import type { Officer } from '../data/officers';
import type { OfficerBackendStatus, OfficerLevel, OfficerStatisticsRecord } from '../types';
import { mapOfficerRecord } from '../utils/mapOfficer';

const SEARCH_DEBOUNCE_MS = 350;
const PAGE_SIZE = 9;

export interface UseOfficerListArgs {
  level: OfficerLevel;
  search: string;
  category: string;
  region: string;
  status: string;
  page: number;
  /** Skips fetching entirely (e.g. while a different, non-API tab is active). */
  enabled: boolean;
}

export interface UseOfficerListResult {
  officers: Officer[];
  totalCount: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

interface ListResult {
  key: string;
  officers: Officer[];
  totalCount: number;
  totalPages: number;
  error: string | null;
}

/**
 * Server-side listing, filtering, and pagination over `GET /api/v1/officers` for the
 * Nodal Officers (L1) / Senior Nodal Officers (L2) tabs.
 *
 * Profile data and performance stats are two separate endpoints (an officer's assigned/
 * resolved/resolution-rate figures are computed live from Grievance on every call, so the
 * backend deliberately doesn't join them into the profile list) — both are fetched per
 * page and merged by user id into the `Officer` shape the existing card UI renders.
 */
export function useOfficerList({ level, search, category, region, status, page, enabled }: UseOfficerListArgs): UseOfficerListResult {
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  const [result, setResult] = useState<ListResult | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const queryKey = useMemo(
    () => JSON.stringify({ level, search: debouncedSearch.trim(), category, region, status, page, reloadToken, enabled }),
    [level, debouncedSearch, category, region, status, page, reloadToken, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    Promise.all([
      fetchOfficers(
        {
          level,
          service_category: category || undefined,
          region: region || undefined,
          status: status ? (status as OfficerBackendStatus) : undefined,
          q: debouncedSearch.trim() || undefined,
          page,
          page_size: PAGE_SIZE,
        },
        { signal: controller.signal }
      ),
      // page_size is capped at 100 server-side — the same cap ListOfficers enforces.
      // A statistics failure (that cap, or anything else) degrades to zeroed-out stats
      // rather than sinking the whole list — the two endpoints are independent, and the
      // list is the more important half.
      fetchOfficerStatistics({ level, page: 1, page_size: 100 }, { signal: controller.signal }).catch(() => null),
    ])
      .then(([list, stats]) => {
        if (controller.signal.aborted) return;
        const statsByUser = new Map<string, OfficerStatisticsRecord>(stats?.officers.map((s) => [s.user, s]) ?? []);
        setResult({
          key: queryKey,
          officers: list.officers.map((record) => mapOfficerRecord(record, statsByUser.get(record.name))),
          totalCount: list.pagination?.total_count ?? list.officers.length,
          totalPages: Math.max(1, list.pagination?.total_pages ?? 1),
          error: null,
        });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setResult({
          key: queryKey,
          officers: [],
          totalCount: 0,
          totalPages: 1,
          error: err instanceof Error ? err.message : 'Failed to load officers',
        });
      });

    return () => controller.abort();
    // queryKey is derived from exactly these same values (plus reloadToken, to force a
    // refetch) — listed individually so the effect depends on what it actually reads,
    // not on a JSON-stringified stand-in for it.
  }, [queryKey, enabled, level, debouncedSearch, category, region, status, page]);

  const refetch = () => setReloadToken((t) => t + 1);

  if (!enabled) {
    return { officers: [], totalCount: 0, totalPages: 1, isLoading: false, error: null, refetch };
  }

  const isSettled = result?.key === queryKey;

  return {
    officers: result?.officers ?? [],
    totalCount: result?.totalCount ?? 0,
    totalPages: result?.totalPages ?? 1,
    isLoading: !isSettled,
    error: isSettled ? result.error : null,
    refetch,
  };
}
