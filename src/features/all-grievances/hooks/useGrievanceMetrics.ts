'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchGrievanceSummary } from '../api/grievanceApi';
import type { GrievanceSummaryCard } from '../types';
import { resolveSummaryTotalCount, sortSummaryCards } from '../utils/summaryMetrics';

export interface UseGrievanceMetricsResult {
  cards: GrievanceSummaryCard[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/** The outcome of one summary request, tagged with the reload token that produced it. */
interface SummaryResult {
  key: number;
  cards: GrievanceSummaryCard[];
  error: string | null;
}

/**
 * KPI card counts from GET /api/v1/grievances/summary.
 * Labels and order come from the backend; icons are matched by status, not position.
 *
 * Loading is derived by comparing the last settled request to the current reload token,
 * rather than being set synchronously inside the effect.
 */
export function useGrievanceMetrics(): UseGrievanceMetricsResult {
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const requestKey = reloadToken;

    fetchGrievanceSummary({ signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        setResult({
          key: requestKey,
          cards: sortSummaryCards(data?.cards ?? []),
          error: null,
        });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setResult({
          key: requestKey,
          cards: [],
          error: err instanceof Error ? err.message : 'Failed to load grievance summary',
        });
      });

    return () => controller.abort();
  }, [reloadToken]);

  const refetch = useCallback(() => setReloadToken((token) => token + 1), []);

  const isSettled = result?.key === reloadToken;
  const cards = result?.cards ?? [];

  return {
    cards,
    totalCount: resolveSummaryTotalCount(cards),
    isLoading: !isSettled,
    error: isSettled && result ? result.error : null,
    refetch,
  };
}
