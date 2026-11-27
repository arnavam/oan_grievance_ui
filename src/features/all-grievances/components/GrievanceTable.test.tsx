/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { render, within, fireEvent } from '@testing-library/react';
import { GrievanceTable } from './GrievanceTable';
import type { Grievance } from '../types';

import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../messages/en.json';

function renderIntl(ui: React.ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => (
      <NextIntlClientProvider locale="en" messages={en}>
        {children}
      </NextIntlClientProvider>
    ),
  });
}


const mockGrievances: Grievance[] = [
  {
    id: 'grv-1',
    ticketId: 'GRV-2026-0001',
    title: 'Water supply disruption in Bole area for several days',
    type: 'Utility Problem',
    category: 'Public Services & Infrastructure',
    location: 'Bole / Addis Ababa',
    status: 'In Progress',
    submittedAt: 'Oct 6, 2026, 01:34 PM',
    escalated: true,
    isAnonymous: false,
    submitterName: 'Abebe Bikila',
    contactMobile: '+251911223344',
    contactEmail: 'abebe@example.com',
    department: 'Water Bureau',
    assignedTo: 'Officer 1',
    slaDueDate: '2026-10-10',
    submissionChannel: 'Web',
  },
  {
    id: 'grv-2',
    ticketId: 'GRV-2026-0002',
    title: 'Pothole on main road',
    type: 'Road Maintenance',
    category: 'Transportation',
    location: 'Yeka / Addis Ababa',
    status: 'Resolved',
    submittedAt: 'Oct 5, 2026, 11:20 AM',
    escalated: false,
    isAnonymous: true,
    submitterName: 'Anonymous',
    contactMobile: '',
    contactEmail: '',
    department: 'Roads Authority',
    assignedTo: 'Officer 2',
    slaDueDate: '2026-10-09',
    submissionChannel: 'Mobile',
  },
];

describe('GrievanceTable', () => {
  const defaultProps = {
    searchTerm: '',
    setSearchTerm: vi.fn(),
    currentPage: 1,
    setCurrentPage: vi.fn(),
    rowsPerPage: 10,
    setRowsPerPage: vi.fn(),
    totalItems: 2,
    totalPages: 1,
    grievances: mockGrievances,
    isLoading: false,
    error: null,
    onRetry: vi.fn(),
    onOpenAdvancedFilters: vi.fn(),
    statusOptions: [],
    categoryOptions: [],
    selectedStatuses: [],
    setSelectedStatuses: vi.fn(),
    selectedCategories: [],
    setSelectedCategories: vi.fn(),
    onClearFilters: vi.fn(),
    onViewGrievance: vi.fn(),
  };

  it('renders grievances rows and calls onViewGrievance on Edit click', () => {
    const onViewGrievance = vi.fn();
    const { container } = renderIntl(
      <GrievanceTable {...defaultProps} onViewGrievance={onViewGrievance} />
    );
    const view = within(container);

    expect(view.getByText('GRV-2026-0001')).toBeTruthy();
    expect(view.getByText('Water supply disruption in Bole area for several days')).toBeTruthy();
    expect(view.getByText('Bole / Addis Ababa')).toBeTruthy();
    expect(view.getByText('Public Services & Infrastructure')).toBeTruthy();
    expect(view.getByText('In Progress')).toBeTruthy();
    expect(view.getByText('Escalated')).toBeTruthy();

    const editButtons = view.getAllByRole('button', { name: /edit/i });
    expect(editButtons.length).toBe(2);

    expect(editButtons[0]).toBeDefined();
    fireEvent.click(editButtons[0]!);
    expect(onViewGrievance).toHaveBeenCalledTimes(1);
    expect(onViewGrievance).toHaveBeenCalledWith(mockGrievances[0]);
  });

  it("shows View instead of Edit when the backend says the viewer cannot act", () => {
    const { container } = renderIntl(
      <GrievanceTable
        {...defaultProps}
        grievances={[
          { ...mockGrievances[0]!, status: "In Progress", canAct: false },
          { ...mockGrievances[1]!, status: "Require More Info", canAct: true },
        ]}
      />
    );
    const view = within(container);
    expect(view.getAllByRole("button", { name: /^view$/i }).length).toBe(1);
    expect(view.getAllByRole("button", { name: /^edit$/i }).length).toBe(1);
  });

  it('flags a case about to breach with a badge and a coloured row, and leaves a breached one plain', () => {
    const day = 86_400_000;
    const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * day).toISOString();
    const { container } = renderIntl(
      <GrievanceTable
        {...defaultProps}
        grievances={[
          { ...mockGrievances[0]!, id: 'a', ticketId: 'T-SOON', status: 'In Progress', slaDueAt: iso(2) },
          { ...mockGrievances[1]!, id: 'b', ticketId: 'T-LATE', status: 'In Progress', slaDueAt: iso(-3) },
        ]}
      />
    );
    const view = within(container);

    expect(view.getByText(/days? left|Due today/)).toBeTruthy();
    expect(view.getByText(/Breached 3 days ago/)).toBeTruthy();
    expect(view.getByText('T-SOON').closest('tr')?.className).toMatch(/bg-(amber|orange)-50/);
    expect(view.getByText('T-LATE').closest('tr')?.className).not.toMatch(/bg-(amber|orange|red)-50/);
  });

  it('renders empty state when there are no records', () => {
    const { container } = renderIntl(
      <GrievanceTable {...defaultProps} grievances={[]} totalItems={0} totalPages={0} />
    );
    expect(within(container).getByText('No grievance records found')).toBeTruthy();
  });

  it('renders error state and retries on button click', () => {
    const onRetry = vi.fn();
    const { container } = renderIntl(
      <GrievanceTable {...defaultProps} error="Network failure" onRetry={onRetry} />
    );
    const view = within(container);
    expect(view.getByText('Could not load grievances')).toBeTruthy();
    expect(view.getByText('Network failure')).toBeTruthy();

    fireEvent.click(view.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('GrievanceTable: duplicates', () => {
  const props = {
    searchTerm: '',
    setSearchTerm: vi.fn(),
    currentPage: 1,
    setCurrentPage: vi.fn(),
    rowsPerPage: 10,
    setRowsPerPage: vi.fn(),
    totalItems: 2,
    totalPages: 1,
    isLoading: false,
    error: null,
    onRetry: vi.fn(),
    onViewGrievance: vi.fn(),
    onOpenAdvancedFilters: vi.fn(),
    statusOptions: [],
    categoryOptions: [],
    selectedStatuses: [],
    selectedCategories: [],
    onStatusChange: vi.fn(),
    onCategoryChange: vi.fn(),
    onClearFilters: vi.fn(),
  };

  it('marks a flagged case with a Review action and a chip naming the earlier ticket', () => {
    const { container } = renderIntl(
      <GrievanceTable
        {...(props as unknown as React.ComponentProps<typeof GrievanceTable>)}
        grievances={[{ ...mockGrievances[0]!, possibleDuplicateOf: 'GRV-2026-0099', canAct: true }]}
      />
    );
    const view = within(container);

    expect(view.getByText('Possible duplicate of GRV-2026-0099')).toBeInTheDocument();
    expect(view.getByRole('button', { name: /^review$/i })).toBeInTheDocument();
    expect(view.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
  });

  it('marks a confirmed duplicate with its main ticket and only lets it be viewed', () => {
    const { container } = renderIntl(
      <GrievanceTable
        {...(props as unknown as React.ComponentProps<typeof GrievanceTable>)}
        grievances={[{ ...mockGrievances[0]!, status: 'Duplicate', duplicateOf: 'GRV-2026-0099', canAct: true }]}
      />
    );
    const view = within(container);

    expect(view.getByText('Duplicate of GRV-2026-0099')).toBeInTheDocument();
    expect(view.getByRole('button', { name: /^view$/i })).toBeInTheDocument();
    expect(view.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
  });
});

describe('GrievanceTable sensitive and urgent chips', () => {
  const defaults = { grievances: mockGrievances } as unknown as React.ComponentProps<typeof GrievanceTable>;

  it('flags a sensitive case and an urgent case', () => {
    const { container } = renderIntl(
      <GrievanceTable
        {...defaults}
        grievances={[{ ...mockGrievances[0]!, isSensitive: true, isUrgent: true }]}
      />
    );
    const view = within(container);
    expect(view.getByText('Sensitive')).toBeInTheDocument();
    expect(view.getByText('Urgent')).toBeInTheDocument();
  });

  it('shows no chip for an ordinary case', () => {
    const { container } = renderIntl(<GrievanceTable {...defaults} grievances={[mockGrievances[0]!]} />);
    const view = within(container);
    expect(view.queryByText('Sensitive')).not.toBeInTheDocument();
    expect(view.queryByText('Urgent')).not.toBeInTheDocument();
  });
});
