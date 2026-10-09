/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useGrievanceMetrics } from './useGrievanceMetrics';
import type { GrievanceSummaryData } from '../types';

vi.mock('../api/grievanceApi', () => ({
  fetchGrievanceSummary: vi.fn(),
}));

import { fetchGrievanceSummary } from '../api/grievanceApi';

const mockFetchSummary = vi.mocked(fetchGrievanceSummary);

const summaryPayload: GrievanceSummaryData = {
  cards: [
    { status: 'Resolved', label: 'Resolved', order: 5, is_open: 1, is_terminal: 0, count: 8 },
    { status: 'All', label: 'All', order: 1, is_open: 1, is_terminal: 0, count: 42 },
    { status: 'In Progress', label: 'In Progress', order: 2, is_open: 1, is_terminal: 0, count: 20 },
  ],
};

describe('useGrievanceMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads KPI cards sorted by order and derives totalCount from All', async () => {
    mockFetchSummary.mockResolvedValue(summaryPayload);

    const { result } = renderHook(() => useGrievanceMetrics());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.totalCount).toBe(42);
    expect(result.current.cards.map((card) => card.status)).toEqual([
      'All',
      'In Progress',
      'Resolved',
    ]);
    expect(mockFetchSummary).toHaveBeenCalledTimes(1);
  });

  it('surfaces an error and clears cards when the summary request fails', async () => {
    mockFetchSummary.mockRejectedValue(new Error('Network down'));

    const { result } = renderHook(() => useGrievanceMetrics());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.cards).toEqual([]);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.error).toBe('Network down');
  });

  it('refetches when refetch is called', async () => {
    mockFetchSummary
      .mockResolvedValueOnce(summaryPayload)
      .mockResolvedValueOnce({
        cards: [
          { status: 'All', label: 'All', order: 1, is_open: 1, is_terminal: 0, count: 50 },
        ],
      });

    const { result } = renderHook(() => useGrievanceMetrics());

    await waitFor(() => {
      expect(result.current.totalCount).toBe(42);
    });

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.totalCount).toBe(50);
    });

    expect(mockFetchSummary).toHaveBeenCalledTimes(2);
  });

  it('treats a missing cards array as an empty list', async () => {
    mockFetchSummary.mockResolvedValue({} as GrievanceSummaryData);

    const { result } = renderHook(() => useGrievanceMetrics());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.cards).toEqual([]);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.error).toBeNull();
  });
});
