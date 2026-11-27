/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useOfficerCount } from './useOfficerCount';

const fetchOfficerStatusCounts = vi.hoisted(() => vi.fn());
vi.mock('../api/officerApi', () => ({ fetchOfficerStatusCounts }));

describe('useOfficerCount', () => {
  it('reads the badge total from the status-counts response', async () => {
    fetchOfficerStatusCounts.mockResolvedValue({ active: 10, on_leave: 2, inactive: 1, total: 13 });

    const { result } = renderHook(() => useOfficerCount('Officer', 'department_head'));

    await waitFor(() => expect(result.current).toBe(13));
    expect(fetchOfficerStatusCounts).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'Officer', level: 'department_head' }),
      expect.anything()
    );
  });

  it('omits level for a Reviewer', async () => {
    fetchOfficerStatusCounts.mockResolvedValue({ active: 4, on_leave: 0, inactive: 1, total: 5 });

    renderHook(() => useOfficerCount('Reviewer'));

    await waitFor(() =>
      expect(fetchOfficerStatusCounts).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'Reviewer', level: undefined }),
        expect.anything()
      )
    );
  });

  it('returns null while unresolved or on failure', async () => {
    fetchOfficerStatusCounts.mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useOfficerCount('Officer', 'L1'));

    expect(result.current).toBeNull();
    await waitFor(() => expect(result.current).toBeNull());
  });
});
