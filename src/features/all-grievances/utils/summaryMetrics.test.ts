import { describe, expect, it } from 'vitest';
import { resolveSummaryTotalCount, sortSummaryCards } from './summaryMetrics';
import type { GrievanceSummaryCard } from '../types';

const sampleCards: GrievanceSummaryCard[] = [
  { status: 'Resolved', label: 'Resolved', order: 5, is_open: 1, is_terminal: 0, count: 8 },
  { status: 'All', label: 'All', order: 1, is_open: 1, is_terminal: 0, count: 42 },
  { status: 'In Progress', label: 'In Progress', order: 2, is_open: 1, is_terminal: 0, count: 20 },
  { status: 'Closed', label: 'Closed', order: 6, is_open: 0, is_terminal: 1, count: 7 },
  { status: 'Require More Info', label: 'Require More Info', order: 3, is_open: 1, is_terminal: 0, count: 4 },
  { status: 'Rejected', label: 'Rejected', order: 4, is_open: 0, is_terminal: 1, count: 3 },
];

describe('sortSummaryCards', () => {
  it('orders cards by the backend order field ascending', () => {
    const sorted = sortSummaryCards(sampleCards);

    expect(sorted.map((card) => card.status)).toEqual([
      'All',
      'In Progress',
      'Require More Info',
      'Rejected',
      'Resolved',
      'Closed',
    ]);
    expect(sorted.map((card) => card.order)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('does not mutate the original array', () => {
    const original = [...sampleCards];
    sortSummaryCards(sampleCards);
    expect(sampleCards).toEqual(original);
  });

  it('returns an empty array when given no cards', () => {
    expect(sortSummaryCards([])).toEqual([]);
  });
});

describe('resolveSummaryTotalCount', () => {
  it('uses the All card count for the page header total', () => {
    expect(resolveSummaryTotalCount(sampleCards)).toBe(42);
  });

  it('matches All status case-insensitively', () => {
    const cards: GrievanceSummaryCard[] = [
      { status: 'all', label: 'All', order: 1, is_open: 1, is_terminal: 0, count: 15 },
      { status: 'Resolved', label: 'Resolved', order: 2, is_open: 1, is_terminal: 0, count: 5 },
    ];
    expect(resolveSummaryTotalCount(cards)).toBe(15);
  });

  it('falls back to the first card count when All is missing', () => {
    const cards: GrievanceSummaryCard[] = [
      { status: 'In Progress', label: 'In Progress', order: 1, is_open: 1, is_terminal: 0, count: 20 },
      { status: 'Resolved', label: 'Resolved', order: 2, is_open: 1, is_terminal: 0, count: 8 },
    ];
    expect(resolveSummaryTotalCount(cards)).toBe(20);
  });

  it('returns 0 when there are no cards', () => {
    expect(resolveSummaryTotalCount([])).toBe(0);
  });
});
