'use client';

import { useEffect, useState } from 'react';
import { fetchGrievanceTypeNames } from '../api/officerApi';

/** The grievance types under one service category; empty until a category is chosen. */
export function useGrievanceTypeOptions(category: string): { options: string[]; isLoading: boolean; isError: boolean } {
  const [loaded, setLoaded] = useState<{ category: string; names: string[]; failed: boolean } | null>(null);

  useEffect(() => {
    if (!category) return;
    const controller = new AbortController();
    fetchGrievanceTypeNames(category, { signal: controller.signal })
      .then((names) => {
        if (!controller.signal.aborted) setLoaded({ category, names, failed: false });
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoaded({ category, names: [], failed: true });
      });
    return () => controller.abort();
  }, [category]);

  const isCurrent = !!category && loaded?.category === category;
  return { options: isCurrent ? loaded.names : [], isLoading: !!category && !isCurrent, isError: isCurrent && loaded.failed };
}
