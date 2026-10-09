'use client';

import { useEffect, useState } from 'react';
import { fetchOfficers } from '../api/officerApi';

export interface OfficerOption {
  value: string;
  label: string;
}

/**
 * L2 officers for the "Reports To" dropdown on an L1 officer's form — only an L1 reports to
 * someone, and that someone must already be an active L2 officer (`services/officer.py`'s
 * `_resolve_supervisor`). Sent back to the API by `value` (the officer's email/user id).
 */
export function useL2OfficerOptions(enabled: boolean): { options: OfficerOption[]; isLoading: boolean } {
  const [options, setOptions] = useState<OfficerOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    // page_size is capped at 100 server-side (ListOfficers' own validation) — asking for
    // more fails the whole request with a 400, which the catch below then silently turns
    // into an empty dropdown instead of a visible error.
    fetchOfficers({ level: 'L2', status: 'Active', page: 1, page_size: 100 }, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        setOptions(data.officers.map((officer) => ({ value: officer.name, label: officer.full_name })));
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setOptions([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [enabled]);

  return { options, isLoading };
}
