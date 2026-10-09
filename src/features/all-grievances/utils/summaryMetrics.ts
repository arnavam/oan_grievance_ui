import type { GrievanceSummaryCard } from '../types';

/** Sort KPI cards by backend-provided display order. */
export function sortSummaryCards(cards: GrievanceSummaryCard[]): GrievanceSummaryCard[] {
  return [...cards].sort((a, b) => a.order - b.order);
}

/**
 * Total for the page header: prefer the "All" card count,
 * otherwise fall back to the first card (after sort) or 0.
 */
export function resolveSummaryTotalCount(cards: GrievanceSummaryCard[]): number {
  const allCard = cards.find((card) => card.status.toLowerCase() === 'all');
  return allCard?.count ?? cards[0]?.count ?? 0;
}
