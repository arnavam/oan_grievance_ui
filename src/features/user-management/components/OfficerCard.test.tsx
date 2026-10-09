/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { OfficerCard } from './OfficerCard';
import type { Officer } from '../data/officers';

const BASE_OFFICER: Officer = {
  id: 'off-1',
  name: 'Tigist Alemu',
  status: 'Active',
  roleTitle: 'Inputs Quality Grievance Officer',
  department: 'Inputs Supply & Distribution Agency',
  email: 'tigist.alemu@isda.gov.et',
  phone: '+251911234567',
  region: 'Oromia',
  regionId: 'region-ET04',
  tags: ['Inputs'],
  assigned: 48,
  resolved: 39,
  avgTimeDays: 11,
  resolutionRate: 81,
  avatarInitials: 'TA',
  avatarBg: 'bg-green-100',
  avatarColor: 'text-green-700',
  mustChangePassword: false,
  reportsTo: null,
};

describe('OfficerCard', () => {
  it('renders the officer profile and an accessible resolution-rate progress bar', () => {
    render(<OfficerCard officer={BASE_OFFICER} onEdit={vi.fn()} />);

    expect(screen.getByText('Tigist Alemu')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();

    const progressbar = screen.getByRole('progressbar', { name: 'Resolution rate' });
    expect(progressbar).toHaveAttribute('aria-valuenow', '81');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
  });

  it('calls onEdit with the officer when the edit button is clicked', () => {
    const onEdit = vi.fn();
    render(<OfficerCard officer={BASE_OFFICER} onEdit={onEdit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit Tigist Alemu' }));

    expect(onEdit).toHaveBeenCalledWith(BASE_OFFICER);
  });

  it('hides the edit button when canEdit is false, for a Review Officer viewer', () => {
    render(<OfficerCard officer={BASE_OFFICER} onEdit={vi.fn()} canEdit={false} />);

    expect(screen.queryByRole('button', { name: 'Edit Tigist Alemu' })).not.toBeInTheDocument();
  });

  it('shows the awaiting-first-sign-in badge only when the officer still holds a temporary password', () => {
    render(<OfficerCard officer={{ ...BASE_OFFICER, mustChangePassword: true }} onEdit={vi.fn()} />);

    expect(screen.getByText('Awaiting first sign-in')).toBeInTheDocument();
  });
});
