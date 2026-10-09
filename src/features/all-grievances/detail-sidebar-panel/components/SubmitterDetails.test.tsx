// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SubmitterDetails } from './SubmitterDetails';
import type { Grievance, GrievanceTimelineData } from '../../types';

afterEach(cleanup);

const mockGrievance: Grievance = {
  id: 'GRV-001',
  ticketId: 'B-001-0012-0',
  title: 'Delayed Fertilizer Delivery',
  location: 'Old Region / Old Woreda',
  type: 'Service Delivery',
  category: 'Inputs',
  status: 'Submitted',
  submittedAt: '2026-09-20 10:00:00',
  escalated: false,
  isAnonymous: false,
  submitterName: 'Abebe Kebede',
  contactMobile: '+251911000000',
  contactEmail: 'abebe@example.com',
  department: 'Agriculture Desk',
  assignedTo: 'Officer Dawit',
  slaDueDate: '2026-09-27',
  submissionChannel: 'Web Portal',
};

describe('SubmitterDetails location priority', () => {
  it('prefers freshly fetched timeline hierarchy location over cached grievance.location', () => {
    const timelineData: GrievanceTimelineData = {
      ticket_number: 'B-001-0012-0',
      status: 'Assigned',
      summary: {
        administrative_hierarchy: {
          region: 'Oromia',
          zone: 'East Shewa',
          woreda: 'Adama Woreda',
          kebele: 'Kebele 01',
        },
      },
    };

    render(<SubmitterDetails grievance={mockGrievance} timelineData={timelineData} />);

    expect(screen.getByText('Adama Woreda / Oromia')).toBeInTheDocument();
    expect(screen.queryByText('Old Region / Old Woreda')).not.toBeInTheDocument();
  });

  it('prefers freshly fetched timelineData.summary.location over cached grievance.location', () => {
    const timelineData: GrievanceTimelineData = {
      ticket_number: 'B-001-0012-0',
      status: 'Assigned',
      summary: {
        location: 'Fresh Reassigned Location',
      },
    };

    render(<SubmitterDetails grievance={mockGrievance} timelineData={timelineData} />);

    expect(screen.getByText('Fresh Reassigned Location')).toBeInTheDocument();
    expect(screen.queryByText('Old Region / Old Woreda')).not.toBeInTheDocument();
  });

  it('falls back to cached grievance.location when timelineData does not specify location', () => {
    render(<SubmitterDetails grievance={mockGrievance} timelineData={null} />);

    expect(screen.getByText('Old Region / Old Woreda')).toBeInTheDocument();
  });
});
