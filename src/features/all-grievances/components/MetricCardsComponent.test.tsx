/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor, within } from '@testing-library/react';
import { MetricCardsComponent } from './MetricCardsComponent';
import type { GrievanceSummaryCard } from '../types';

const cards: GrievanceSummaryCard[] = [
  { status: 'All', label: 'All', order: 1, is_open: 1, is_terminal: 0, count: 42 },
  { status: 'In Progress', label: 'In Progress', order: 2, is_open: 1, is_terminal: 0, count: 20 },
  { status: 'Require More Info', label: 'Require More Info', order: 3, is_open: 1, is_terminal: 0, count: 4 },
  { status: 'Rejected', label: 'Rejected', order: 4, is_open: 0, is_terminal: 1, count: 3 },
  { status: 'Resolved', label: 'Resolved', order: 5, is_open: 1, is_terminal: 0, count: 8 },
  { status: 'Closed', label: 'Closed', order: 6, is_open: 0, is_terminal: 1, count: 7 },
];

function visuals(container: HTMLElement): string[] {
  return [...container.querySelectorAll('[data-visual]')].map(
    (node) => node.getAttribute('data-visual') ?? ''
  );
}

describe('MetricCardsComponent', () => {
  it('renders labels and counts from the summary API cards', () => {
    const { container } = render(<MetricCardsComponent cards={cards} />);
    const view = within(container);

    expect(view.getByText('All')).toBeTruthy();
    expect(view.getByText('42')).toBeTruthy();
    expect(view.getByText('In Progress')).toBeTruthy();
    expect(view.getByText('20')).toBeTruthy();
    expect(view.getByText('Require More Info')).toBeTruthy();
    expect(view.getByText('4')).toBeTruthy();
    expect(view.getByText('Rejected')).toBeTruthy();
    expect(view.getByText('3')).toBeTruthy();
    expect(view.getByText('Resolved')).toBeTruthy();
    expect(view.getByText('8')).toBeTruthy();
    expect(view.getByText('Closed')).toBeTruthy();
    expect(view.getByText('7')).toBeTruthy();
  });

  it('matches icons to status even when the backend reorders the cards', () => {
    const rejected = cards.find((card) => card.status === 'Rejected');
    const all = cards.find((card) => card.status === 'All');
    const resolved = cards.find((card) => card.status === 'Resolved');
    if (!rejected || !all || !resolved) throw new Error('fixture cards missing');

    const { container } = render(<MetricCardsComponent cards={[rejected, all, resolved]} />);

    expect(visuals(container)).toEqual(['rejected', 'all', 'resolved']);
  });

  it('keeps the Assigned icon when that officer card is inserted ahead of later statuses', () => {
    const all = cards.find((card) => card.status === 'All');
    const rejected = cards.find((card) => card.status === 'Rejected');
    if (!all || !rejected) throw new Error('fixture cards missing');

    const withAssigned: GrievanceSummaryCard[] = [
      all,
      { status: 'Assigned', label: 'Assigned', order: 2, is_open: 1, is_terminal: 0, count: 6 },
      { ...rejected, order: 5 },
    ];

    const { container } = render(<MetricCardsComponent cards={withAssigned} />);

    expect(visuals(container)).toEqual(['all', 'assigned', 'rejected']);
  });

  it('falls back to the label when the status string is unfamiliar', () => {
    const byLabel: GrievanceSummaryCard[] = [
      { status: 'queue-4', label: 'Rejected', order: 1, is_open: 0, is_terminal: 1, count: 3 },
    ];

    const { container } = render(<MetricCardsComponent cards={byLabel} />);

    expect(visuals(container)).toEqual(['rejected']);
  });

  it('uses a neutral visual for a status that is neither known nor labelled as one', () => {
    const extraCards: GrievanceSummaryCard[] = [
      ...cards,
      { status: 'Escalated', label: 'Escalated', order: 7, is_open: 1, is_terminal: 0, count: 2 },
    ];

    const { container } = render(<MetricCardsComponent cards={extraCards} />);
    const view = within(container);

    expect(view.getByText('Escalated')).toBeTruthy();
    expect(view.getByText('2')).toBeTruthy();
    expect(visuals(container).at(-1)).toBe('fallback');
    expect(visuals(container)).toContain('rejected');
  });

  it('renders nothing when the cards list is empty', () => {
    const { container } = render(<MetricCardsComponent cards={[]} />);
    expect(container.querySelectorAll('.group')).toHaveLength(0);
  });

  it('treats a missing count as zero', () => {
    const incomplete: GrievanceSummaryCard[] = [
      {
        status: 'All',
        label: 'All',
        order: 1,
        is_open: 1,
        is_terminal: 0,
        count: undefined as unknown as number,
      },
    ];

    const { container } = render(<MetricCardsComponent cards={incomplete} />);
    const view = within(container);

    expect(view.getByText('All')).toBeTruthy();
    expect(view.getByText('0')).toBeTruthy();
  });

  it('shows skeleton cards while the summary is loading instead of a zero count', () => {
    const { container } = render(<MetricCardsComponent cards={[]} isLoading />);
    const view = within(container);

    expect(view.getByRole('status', { name: 'Loading grievance summary' })).toBeTruthy();
    expect(container.querySelectorAll('[data-visual]')).toHaveLength(0);
    expect(view.queryByText('0')).toBeNull();
  });

  it('shows the summary error and retries instead of an empty card row', () => {
    const onRetry = vi.fn();
    const { container } = render(
      <MetricCardsComponent cards={[]} error="Network down" onRetry={onRetry} />
    );
    const view = within(container);

    expect(view.getByRole('alert')).toBeTruthy();
    expect(view.getByText('Could not load grievance summary')).toBeTruthy();
    expect(view.getByText('Network down')).toBeTruthy();
    expect(container.querySelectorAll('[data-visual]')).toHaveLength(0);

    fireEvent.click(view.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders pagination dots and moves the active dot indicator on scroll', async () => {
    const { container } = render(<MetricCardsComponent cards={cards} />);
    const dots = container.querySelectorAll('button[aria-label^="Go to page"]');

    // 6 cards -> Math.min(6, 3) = 3 dots
    expect(dots).toHaveLength(3);

    // Initial state: Dot 1 is active (green pill)
    expect(dots[0]!.className).toContain('bg-[#16A34A]');
    expect(dots[1]!.className).toContain('bg-gray-300');
    expect(dots[2]!.className).toContain('bg-gray-300');

    const scrollContainer = container.querySelector('.overflow-x-auto') as HTMLDivElement;
    expect(scrollContainer).toBeTruthy();

    // Mock dimensions: maxScroll = 1000 - 400 = 600
    Object.defineProperty(scrollContainer, 'scrollWidth', { value: 1000, configurable: true });
    Object.defineProperty(scrollContainer, 'clientWidth', { value: 400, configurable: true });
    Object.defineProperty(scrollContainer, 'scrollLeft', { value: 600, writable: true, configurable: true });

    fireEvent.scroll(scrollContainer);

    // Wait for rAF to execute
    await waitFor(() => {
      // Scrolled to end: Dot 3 (index 2) should now be active
      expect(dots[2]!.className).toContain('bg-[#16A34A]');
      expect(dots[0]!.className).toContain('bg-gray-300');
    });
  });

  it('scrolls the carousel to the corresponding progress when a dot is clicked', () => {
    const { container } = render(<MetricCardsComponent cards={cards} />);
    const dots = container.querySelectorAll('button[aria-label^="Go to page"]');
    const scrollContainer = container.querySelector('.overflow-x-auto') as HTMLDivElement;

    Object.defineProperty(scrollContainer, 'scrollWidth', { value: 1000, configurable: true });
    Object.defineProperty(scrollContainer, 'clientWidth', { value: 400, configurable: true });
    scrollContainer.scrollTo = vi.fn();

    // Click last dot (page 3 / progress 1.0)
    fireEvent.click(dots[2]!);

    expect(scrollContainer.scrollTo).toHaveBeenCalledWith({
      left: 600,
      behavior: 'smooth',
    });

    // Click middle dot (page 2 / progress 0.5)
    fireEvent.click(dots[1]!);

    expect(scrollContainer.scrollTo).toHaveBeenCalledWith({
      left: 300,
      behavior: 'smooth',
    });
  });

  it('attaches scroll listeners and updates active dot even after mounting initially in loading state', async () => {
    const { container, rerender } = render(<MetricCardsComponent cards={[]} isLoading />);

    // Initially skeleton
    expect(container.querySelectorAll('button[aria-label^="Go to page"]')).toHaveLength(0);

    // Now cards finish loading
    rerender(<MetricCardsComponent cards={cards} isLoading={false} />);

    const dots = container.querySelectorAll('button[aria-label^="Go to page"]');
    expect(dots).toHaveLength(3);
    expect(dots[0]!.className).toContain('bg-[#16A34A]');

    const scrollContainer = container.querySelector('.overflow-x-auto') as HTMLDivElement;
    expect(scrollContainer).toBeTruthy();

    Object.defineProperty(scrollContainer, 'scrollWidth', { value: 1000, configurable: true });
    Object.defineProperty(scrollContainer, 'clientWidth', { value: 400, configurable: true });
    Object.defineProperty(scrollContainer, 'scrollLeft', { value: 300, writable: true, configurable: true });

    fireEvent.scroll(scrollContainer);

    await waitFor(() => {
      // Scrolled to 50% (300 / 600 = 0.5): Dot 2 (middle dot, index 1) should now be active
      expect(dots[1]!.className).toContain('bg-[#16A34A]');
      expect(dots[0]!.className).toContain('bg-gray-300');
      expect(dots[2]!.className).toContain('bg-gray-300');
    });
  });
});
