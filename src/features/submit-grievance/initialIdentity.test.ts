import { describe, expect, it } from 'vitest';
import type { User } from '@/features/auth/store/authSlice';
import { buildInitialIdentityValues, identityAfterReset, resolveInitialSubmitterType } from './initialIdentity';

const FULL_USER: User = {
  email: 'agent@example.com',
  roles: ['Grievance Submitter'],
  full_name: 'Tigist Agent',
  mobile_no: '+251911000000',
  fayda_id: 'ET-FAYDA-111',
  type: 'Individual Farmer',
};

describe('buildInitialIdentityValues', () => {
  it("prefills Step 1 from the signed-in account for a submitter who files for themselves", () => {
    expect(buildInitialIdentityValues(FULL_USER, null, 'individual')).toEqual({
      fullName: 'Tigist Agent',
      faydaId: 'ET-FAYDA-111',
      phoneCode: '+251',
      phoneNumber: '911000000',
      email: 'agent@example.com',
    });
  });

  it('lets the live account win over the registration snapshot, and keeps snapshot-only fields', () => {
    const saved = {
      submitterType: 'cooperative',
      identityValues: { fullName: 'Stale Name', organizationName: 'Green FPO' },
    };
    const values = buildInitialIdentityValues(FULL_USER, saved, 'cooperative');
    expect(values.fullName).toBe('Tigist Agent');
    expect(values.organizationName).toBe('Green FPO');
  });

  it("prefills nothing for a Development Agent, even though the account has a name, Fayda ID, phone and email", () => {
    // Those keys on the agent's form are the *farmer's* details.
    expect(buildInitialIdentityValues({ ...FULL_USER, type: 'Development Agent' }, null, 'development_agent')).toEqual({});
  });

  it('prefills nothing for a Development Agent even if a registration snapshot exists', () => {
    const saved = { submitterType: 'development_agent', identityValues: { farmerName: 'Someone', faydaId: 'X-1' } };
    expect(buildInitialIdentityValues(FULL_USER, saved, 'development_agent')).toEqual({});
  });

  it('returns an empty object when there is no account and no snapshot', () => {
    expect(buildInitialIdentityValues(null, null, 'individual')).toEqual({});
  });
});

describe('resolveInitialSubmitterType', () => {
  it("uses the account's own type when it maps to a known one", () => {
    expect(resolveInitialSubmitterType({ ...FULL_USER, type: 'Development Agent' }, null)).toBe('development_agent');
    expect(resolveInitialSubmitterType({ ...FULL_USER, type: 'Individual Farmer' }, null)).toBe('individual');
  });

  it('falls back to the registration snapshot, then to empty', () => {
    const saved = { submitterType: 'ngo', identityValues: {} };
    expect(resolveInitialSubmitterType({ ...FULL_USER, type: 'Grievance Submitter' }, saved)).toBe('ngo');
    expect(resolveInitialSubmitterType(null, null)).toBe('');
  });
});

describe('identityAfterReset', () => {
  const identity = { fullName: 'Tigist', faydaId: 'ET-1', phoneNumber: '+251911000000' };

  it('keeps Step 1 for the next grievance, so a returning submitter is not made to retype who they are', () => {
    for (const type of ['individual', 'cooperative', 'ngo', 'woreda_kebele']) {
      expect(identityAfterReset(type, identity)).toBe(identity);
    }
  });

  it('starts a Development Agent blank, because those fields are the last farmer’s details, not the agent’s', () => {
    expect(identityAfterReset('development_agent', identity)).toEqual({});
  });
});
