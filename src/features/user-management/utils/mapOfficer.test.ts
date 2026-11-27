import { describe, expect, it } from 'vitest';
import { mapOfficerRecord } from './mapOfficer';
import type { OfficerRecord } from '../types';

const RECORD: OfficerRecord = {
  name: 'dawit.haile@mdtb.gov.et',
  full_name: 'Dawit Haile',
  role: 'Officer',
  designation: null,
  // The Zone rung made the department head L4; the title must not depend on this token.
  level: 'L4',
  department: null,
  email: 'dawit.haile@mdtb.gov.et',
  phone: null,
  must_change_password: false,
  region: 'region-ET02',
  region_name: 'Afar',
  status: 'Active',
  service_categories: ['Markets'],
  reports_to: null,
  reports_to_name: null,
  assignments: [],
} as unknown as OfficerRecord;

describe('mapOfficerRecord roleTitle', () => {
  it('uses the name of the level the list was queried by, whatever tier token the row carries', () => {
    expect(mapOfficerRecord(RECORD, undefined, 'Regional Bureau Head').roleTitle).toBe('Regional Bureau Head');
    expect(mapOfficerRecord({ ...RECORD, level: 'L3' }, undefined, 'Regional Bureau Head').roleTitle).toBe('Regional Bureau Head');
  });

  it('names a Reviewer by role, with no level', () => {
    expect(mapOfficerRecord({ ...RECORD, role: 'Reviewer', level: null }, undefined).roleTitle).toBe('Review Officer');
  });

  it('falls back to a plain title when no level name is given', () => {
    expect(mapOfficerRecord(RECORD, undefined).roleTitle).toBe('Officer');
  });
});
