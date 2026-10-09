/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { render, within, fireEvent } from '@testing-library/react';
import { GrievanceTable } from './GrievanceTable';
import type { Grievance } from '../types';

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

  it('renders grievances rows and calls onViewGrievance on View click', () => {
    const onViewGrievance = vi.fn();
    const { container } = render(
      <GrievanceTable {...defaultProps} onViewGrievance={onViewGrievance} />
    );
    const view = within(container);

    expect(view.getByText('GRV-2026-0001')).toBeTruthy();
    expect(view.getByText('Water supply disruption in Bole area for several days')).toBeTruthy();
    expect(view.getByText('Bole / Addis Ababa')).toBeTruthy();
    expect(view.getByText('Public Services & Infrastructure')).toBeTruthy();
    expect(view.getByText('In Progress')).toBeTruthy();
    expect(view.getByText('Escalated')).toBeTruthy();

    const viewButtons = view.getAllByRole('button', { name: /view/i });
    expect(viewButtons.length).toBe(2);

    expect(viewButtons[0]).toBeDefined();
    fireEvent.click(viewButtons[0]!);
    expect(onViewGrievance).toHaveBeenCalledTimes(1);
    expect(onViewGrievance).toHaveBeenCalledWith(mockGrievances[0]);
  });

  it('renders empty state when there are no records', () => {
    const { container } = render(
      <GrievanceTable {...defaultProps} grievances={[]} totalItems={0} totalPages={0} />
    );
    expect(within(container).getByText('No grievance records found')).toBeTruthy();
  });

  it('renders error state and retries on button click', () => {
    const onRetry = vi.fn();
    const { container } = render(
      <GrievanceTable {...defaultProps} error="Network failure" onRetry={onRetry} />
    );
    const view = within(container);
    expect(view.getByText('Could not load grievances')).toBeTruthy();
    expect(view.getByText('Network failure')).toBeTruthy();

    fireEvent.click(view.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
