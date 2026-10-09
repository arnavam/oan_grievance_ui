'use client';

import { useEffect, useState } from 'react';
import { fetchCategoryAssignments } from '../api/officerApi';

export interface CategoryOption {
  value: string;
  label: string;
}

/**
 * The service categories that actually have an active routing desk for `department` — not
 * every category that exists in general. An officer can only be placed on a category desk
 * that exists, so offering an unwired category here would just move the "no category
 * assignment found" failure from a proactive dropdown to a reactive submit error. Empty and
 * not loading while `department` is blank — there is nothing to look up yet.
 */
export function useWiredCategoryOptions(department: string): { options: CategoryOption[]; isLoading: boolean } {
  // Holds the last fetch's result, keyed to whichever department it was fetched for — masked
  // out below when `department` is blank, so a stale result from a previous department (or
  // before the first selection) never needs an extra setState call to clear it.
  const [fetchedOptions, setFetchedOptions] = useState<CategoryOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!department) return;

    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    fetchCategoryAssignments({ department, active: true, page: 1, page_size: 100 }, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        const categories = Array.from(new Set(data.assignments.map((a) => a.service_category)));
        setFetchedOptions(categories.map((category) => ({ value: category, label: category })));
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setFetchedOptions([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [department]);

  if (!department) return { options: [], isLoading: false };
  return { options: fetchedOptions, isLoading };
}
