'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { fetchGrievances } from '../api/grievanceApi';
import type { Grievance, GrievanceFilters } from '../types';
import { mapGrievanceListItem } from '../utils/mapGrievance';

const SEARCH_DEBOUNCE_MS = 350;

export interface UseGrievanceListArgs {
  filters: GrievanceFilters;
  search: string;
  page: number;
  pageSize: number;
}

export interface UseGrievanceListResult {
  grievances: Grievance[];
  totalItems: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/** The outcome of one query, tagged with the request key that produced it. */
interface ListResult {
  key: string;
  grievances: Grievance[];
  totalItems: number;
  totalPages: number;
  error: string | null;
}

/**
 * Server-side listing, filtering, and pagination via GET /api/v1/grievances.
 *
 * Every filter change re-queries the backend; in-flight requests are aborted so a slow
 * earlier response can't overwrite a newer one. Loading state is derived by comparing the
 * key of the last settled result against the current one, rather than being set
 * synchronously inside the effect.
 */
export function useGrievanceList({
  filters,
  search,
  page,
  pageSize,
}: UseGrievanceListArgs): UseGrievanceListResult {
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  const [result, setResult] = useState<ListResult | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // Serialise the query so the effect depends on the filters' contents rather than on
  // the object identity the caller happens to hand us.
  const queryKey = useMemo(
    () =>
      JSON.stringify({
        status: filters.status,
        category: filters.category,
        regions: filters.regions.map((a) => a.id),
        woredas: filters.woredas.map((a) => a.id),
        kebeles: filters.kebeles.map((a) => a.id),
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        search: debouncedSearch.trim(),
        page,
        pageSize,
        reloadToken,
      }),
    [filters, debouncedSearch, page, pageSize, reloadToken]
  );

  useEffect(() => {
    const params = JSON.parse(queryKey) as {
      status: string[];
      category: string[];
      regions: string[];
      woredas: string[];
      kebeles: string[];
      fromDate: string;
      toDate: string;
      search: string;
      page: number;
      pageSize: number;
    };

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    fetchGrievances(
      {
        page: params.page,
        page_size: params.pageSize,
        status: params.status,
        category: params.category,
        region: params.regions,
        woreda: params.woredas,
        kebele: params.kebeles,
        from_date: params.fromDate || undefined,
        to_date: params.toDate || undefined,
        search: params.search || undefined,
      },
      { signal: controller.signal }
    )
      .then((data) => {
        if (controller.signal.aborted) return;
        const nonDraftItems = (data?.items ?? []).filter((item) => item.status !== 'Draft');
        setResult({
          key: queryKey,
          grievances: nonDraftItems.map(mapGrievanceListItem),
          totalItems: data?.pagination?.total_count ?? nonDraftItems.length,
          totalPages: Math.max(1, data?.pagination?.total_pages ?? 1),
          error: null,
        });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setResult({
          key: queryKey,
          grievances: [],
          totalItems: 0,
          totalPages: 1,
          error: err instanceof Error ? err.message : 'Failed to load grievances',
        });
      });

    return () => controller.abort();
  }, [queryKey]);

  const refetch = useCallback(() => setReloadToken((token) => token + 1), []);

  const isSettled = result?.key === queryKey;

  return {
    // Keep showing the previous page's rows while the next one loads.
    grievances: result?.grievances ?? [],
    totalItems: result?.totalItems ?? 0,
    totalPages: result?.totalPages ?? 1,
    isLoading: !isSettled,
    error: isSettled ? result.error : null,
    refetch,
  };
}
