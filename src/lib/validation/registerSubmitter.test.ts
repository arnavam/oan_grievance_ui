import { describe, expect, it } from 'vitest';
import { registerSubmitterFieldsSchema } from './registerSubmitter';

describe('registerSubmitterFieldsSchema', () => {
  it('accepts a type and a 12- or 16-digit Fayda ID', () => {
    for (const fayda_id of ['655709214753', '6557092147530500']) {
      const input = { submitter_type: 'Individual Farmer', fayda_id };
      expect(registerSubmitterFieldsSchema.parse(input)).toEqual(input);
    }
  });

  it('treats both as optional', () => {
    expect(registerSubmitterFieldsSchema.parse({})).toEqual({});
  });

  it('drops any other key instead of passing it through', () => {
    const parsed = registerSubmitterFieldsSchema.parse({
      fayda_id: '6557092147530500',
      dedupe_key: 'x',
      role: 'Grievance Admin',
      submission_channel: 'Web Portal',
    });
    expect(parsed).toEqual({ fayda_id: '6557092147530500' });
  });

  it('rejects a Fayda ID that is not 12 or 16 digits, or not text', () => {
    for (const fayda_id of [
      '12345',
      '12345678901',
      '1234567890123',
      '123456789012345',
      '65570921475305001',
      '6557-0921-4753-0500',
      'ET-FAYDA-344012394',
      '',
      6557092147530500,
    ]) {
      const result = registerSubmitterFieldsSchema.safeParse({ fayda_id });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe('Fayda ID must be a 12- or 16-digit number.');
    }
  });

  it('accepts an NGO or FPO with its representative’s Fayda ID', () => {
    for (const submitter_type of ['NGO', 'FPO']) {
      const input = { submitter_type, fayda_id: '6557092147530500' };
      expect(registerSubmitterFieldsSchema.parse(input)).toEqual(input);
    }
  });

  it('never forwards a registration number: an NGO / FPO registers without one', () => {
    const parsed = registerSubmitterFieldsSchema.parse({
      submitter_type: 'NGO',
      fayda_id: '6557092147530500',
      registration_number: 'REG-2024/0042',
    });
    expect(parsed).toEqual({ submitter_type: 'NGO', fayda_id: '6557092147530500' });
  });
  it('rejects an unsupported type', () => {
    expect(registerSubmitterFieldsSchema.safeParse({ submitter_type: 'Cooperative' }).success).toBe(false);
  });
});
