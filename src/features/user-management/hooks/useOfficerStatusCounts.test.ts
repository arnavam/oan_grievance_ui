/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useOfficerStatusCounts } from './useOfficerStatusCounts';

const fetchOfficers = vi.hoisted(() => vi.fn());
vi.mock('../api/officerApi', () => ({ fetchOfficers }));

function totalFor(count: number) {
  return { officers: [], pagination: { page: 1, page_size: 1, total_count: count, total_pages: 1, has_next: false, has_prev: false } };
}

describe('useOfficerStatusCounts', () => {
  it('reads each status total from pagination.total_count across the whole dataset, not just the current page', async () => {
    fetchOfficers.mockImplementation((params: { status?: string }) => {
      if (params.status === 'Active') return Promise.resolve(totalFor(142));
      if (params.status === 'On Leave') return Promise.resolve(totalFor(6));
      if (params.status === 'Inactive') return Promise.resolve(totalFor(3));
      throw new Error(`unexpected status ${params.status}`);
    });

    const { result } = renderHook(() => useOfficerStatusCounts('L1', true));

    await waitFor(() => expect(result.current).toEqual({ active: 142, onLeave: 6, inactive: 3 }));

    expect(fetchOfficers).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'L1', status: 'Active', page: 1, page_size: 1 }),
      expect.anything()
    );
  });

  it('skips fetching and returns zeros while a non-API (dummy) tab is active', () => {
    fetchOfficers.mockClear();
    const { result } = renderHook(() => useOfficerStatusCounts('L1', false));

    expect(result.current).toEqual({ active: 0, onLeave: 0, inactive: 0 });
    expect(fetchOfficers).not.toHaveBeenCalled();
  });

  it('falls back to zeros if any of the three requests fails', async () => {
    fetchOfficers.mockImplementation((params: { status?: string }) =>
      params.status === 'Inactive' ? Promise.reject(new Error('network error')) : Promise.resolve(totalFor(10))
    );

    const { result } = renderHook(() => useOfficerStatusCounts('L2', true));

    await waitFor(() => expect(result.current).toEqual({ active: 0, onLeave: 0, inactive: 0 }));
  });
});
