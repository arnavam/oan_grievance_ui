import { describe, expect, it } from 'vitest';
import { mapGrievanceListItem, getInitials, normalizeTimelineEntry } from './mapGrievance';
import type { GrievanceListItem, TimelineEntry, TimelineEventItem } from '../types';

const baseItem: GrievanceListItem = {
  name: 'GRV-0001',
  ticket_number: 'SOMA-JIG-INP-09905',
  status: 'Submitted',
  escalated: false,
  is_anonymous: false,
  submitter_name: 'Abebe Bekele',
  administrative_hierarchy: { woreda: 'Basona Werana', region: 'Oromia' },
  administrative_area: 'ET.OR.BSH',
  service_category: 'Inputs',
  grievance_type: 'Fertilizer non-delivery or shortage',
  description: 'Fertiliser allocation delivered 6 weeks late\nSecond paragraph of detail',
  assigned_dept: 'Agriculture',
  submitted_on: '2026-05-28 10:42:13.123456',
};

describe('mapGrievanceListItem', () => {
  it('flattens a list row into the shape the table renders with Location as Woreda / Region', () => {
    const grievance = mapGrievanceListItem(baseItem);

    expect(grievance.id).toBe('GRV-0001');
    expect(grievance.ticketNumber).toBe('SOMA-JIG-INP-09905');
    expect(grievance.ticketId).toBe('SOMA-JIG-INP-09905');
    expect(grievance.title).toBe('Fertiliser allocation delivered 6 weeks late');
    expect(grievance.location).toBe('Basona Werana / Oromia');
    expect(grievance.category).toBe('Inputs');
    expect(grievance.department).toBe('Agriculture');
    expect(grievance.submittedAt).toMatch(/May 28, 2026/);
  });

  it('withholds submitter identity on anonymous grievances while keeping location intact', () => {
    const grievance = mapGrievanceListItem({
      ...baseItem,
      is_anonymous: true,
      submitter_name: 'Abebe Bekele',
      contact_mobile: '+251900000000',
      contact_email: 'abebe@example.com',
    });

    expect(grievance.submitterName).toBe('Anonymous');
    expect(grievance.contactMobile).toBe('');
    expect(grievance.contactEmail).toBe('');
    expect(grievance.location).toBe('Basona Werana / Oromia');
  });

  it('tolerates missing optional fields', () => {
    const grievance = mapGrievanceListItem({
      name: 'GRV-0002',
      ticket_number: '',
      status: 'Resolved',
      escalated: true,
      is_anonymous: false,
    });

    expect(grievance.ticketId).toBe('GRV-0002');
    expect(grievance.title).toBe('Untitled grievance');
    expect(grievance.location).toBe('');
    expect(grievance.submittedAt).toBe('');
    expect(grievance.escalated).toBe(true);
  });

  it('formats location from comma-separated location string', () => {
    const grievance = mapGrievanceListItem({
      ...baseItem,
      administrative_hierarchy: null,
      administrative_area: null,
      location: 'Kebele 01, Basona Werana, North Shewa, Oromia, Ethiopia',
    });

    expect(grievance.location).toBe('Basona Werana / Oromia');
  });

  it('formats location from administrative_area dotted path', () => {
    const grievance = mapGrievanceListItem({
      ...baseItem,
      administrative_hierarchy: null,
      location: null,
      administrative_area: 'ET.OR.BSH',
    });

    expect(grievance.location).toBe('BSH / OR');
  });

  it('prefers ticket_number_display when provided by the backend', () => {
    const grievance = mapGrievanceListItem({
      ...baseItem,
      ticket_number_display: 'ET14IN000012026',
    });

    expect(grievance.ticketId).toBe('ET14IN000012026');
    expect(grievance.ticketNumberDisplay).toBe('ET14IN000012026');
    expect(grievance.ticketNumber).toBe('SOMA-JIG-INP-09905');
    expect(grievance.id).toBe('GRV-0001');
  });
});

describe('getInitials', () => {
  it('extracts initials for various name patterns', () => {
    expect(getInitials('Abebe Bekele')).toBe('AB');
    expect(getInitials('Tigist Alemu')).toBe('TA');
    expect(getInitials('Admin')).toBe('AD');
    expect(getInitials('Yonas Mekonnen Kebede')).toBe('YK');
    expect(getInitials('')).toBe('??');
    expect(getInitials(null)).toBe('??');
  });
});

describe('normalizeTimelineEntry', () => {
  it('normalizes backend TimelineEntry correctly', () => {
    const entry: TimelineEntry = {
      name: 'GR-TIME-00001',
      entry_type: 'note',
      is_internal: true,
      body: 'Investigating warehouse logs.',
      author_user: 'officer@example.com',
      author_name: 'Tigist Alemu',
      author_type: 'officer',
      created_on: '2026-04-12T10:15:00Z',
    };

    const normalized = normalizeTimelineEntry(entry);
    expect(normalized.id).toBe('GR-TIME-00001');
    expect(normalized.typeLabel).toBe('Internal Note');
    expect(normalized.isInternal).toBe(true);
    expect(normalized.authorName).toBe('Tigist Alemu');
    expect(normalized.authorType).toBe('officer');
    expect(normalized.initials).toBe('TA');
    expect(normalized.body).toBe('Investigating warehouse logs.');
  });

  it('normalizes OpenAPI TimelineEventItem correctly', () => {
    const event: TimelineEventItem = {
      event_type: 'Status Change',
      from_status: 'Assigned',
      to_status: 'In Progress',
      actor: 'Tigist Alemu',
      actor_role: 'Grievance Officer',
      message: 'Status updated to In Progress',
      creation: '2026-04-28T19:40:00Z',
    };

    const normalized = normalizeTimelineEntry(event);
    expect(normalized.typeLabel).toBe('Status Change');
    expect(normalized.authorName).toBe('Tigist Alemu');
    expect(normalized.fromStatus).toBe('Assigned');
    expect(normalized.toStatus).toBe('In Progress');
  });

  it('normalizes submission, resolution, and rejection entries with attachments', () => {
    const submissionEntry: TimelineEntry = {
      name: 'GR-TIME-SUB-01',
      entry_type: 'submission',
      is_internal: false,
      body: 'Description of the grievance filed by farmer.',
      author_name: 'Abebe Bekele',
      author_type: 'submitter',
      created_on: '2026-04-10T10:00:00Z',
      attachments: [
        {
          name: 'ATT-001',
          file_name: 'receipt.pdf',
          file_size: 102400,
          file_url: '/files/receipt.pdf',
        },
      ],
    };

    const normSubmission = normalizeTimelineEntry(submissionEntry);
    expect(normSubmission.entryType).toBe('submission');
    expect(normSubmission.typeLabel).toBe('Submission');
    expect(normSubmission.attachments?.length).toBe(1);
    expect(normSubmission.attachments?.[0]?.file_name).toBe('receipt.pdf');

    const resolutionEntry: TimelineEntry = {
      name: 'GR-TIME-RES-01',
      entry_type: 'resolution',
      is_internal: false,
      body: 'Fertilizer delivered successfully.',
      created_on: '2026-04-15T12:00:00Z',
    };
    const normResolution = normalizeTimelineEntry(resolutionEntry);
    expect(normResolution.entryType).toBe('resolution');
    expect(normResolution.typeLabel).toBe('Resolution');

    const rejectionEntry: TimelineEntry = {
      name: 'GR-TIME-REJ-01',
      entry_type: 'rejection',
      is_internal: false,
      body: 'Out of scope.',
      created_on: '2026-04-16T12:00:00Z',
    };
    const normRejection = normalizeTimelineEntry(rejectionEntry);
    expect(normRejection.entryType).toBe('rejection');
    expect(normRejection.typeLabel).toBe('Rejection');
  });

  it('resolves officer author from author_user without ambiguous fallbacks', () => {
    const officerEntry: TimelineEntry = {
      name: 'GR-TIME-005628',
      action: 'Start Work',
      author_role: 'Nodal Officer',
      author_submitter: null,
      author_type: 'officer',
      author_user: 'officer@oan.com',
      body: 'Action taken:\nhi\n\nResolution summary:\nhi',
      entry_type: 'status_change',
      is_internal: false,
      created_on: '2026-10-07T06:05:25.945830+03:00',
    };

    const normalized = normalizeTimelineEntry(officerEntry);
    expect(normalized.authorName).toBe('Nodal Officer');
    expect(normalized.authorRole).toBe('Nodal Officer');
    expect(normalized.authorType).toBe('officer');
    expect(normalized.initials).toBe('NO');
  });

  it('resolves submitter author using submitterContext without falling back to generic Citizen Submitter', () => {
    const submitterEntry: TimelineEntry = {
      name: 'GR-TIME-005608',
      action: null,
      author_role: 'Individual Farmer',
      author_submitter: 'SUB-00141',
      author_type: 'submitter',
      author_user: null,
      body: 'sssssssssssssssssssssssss',
      entry_type: 'submission',
      is_internal: false,
      created_on: '2026-10-07T06:00:44.969430+03:00',
    };

    const normalized = normalizeTimelineEntry(submitterEntry, 0, {
      submitterName: 'Abebe Bikila',
      isAnonymous: false,
    });
    expect(normalized.authorName).toBe('Abebe Bikila');
    expect(normalized.authorRole).toBe('Individual Farmer');
    expect(normalized.authorType).toBe('submitter');
    expect(normalized.initials).toBe('AB');

    const anonymousNorm = normalizeTimelineEntry(submitterEntry, 0, {
      submitterName: null,
      isAnonymous: true,
    });
    expect(anonymousNorm.authorName).toBe('Anonymous Submitter');
    expect(anonymousNorm.initials).toBe('AS');
  });
});
