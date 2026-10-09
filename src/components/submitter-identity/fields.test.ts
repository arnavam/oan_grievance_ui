import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REQUIRED_MESSAGE,
  getFieldError,
  getFieldErrors,
  getFieldFormatErrors,
  getMissingRequiredFields,
  submitsOnBehalfOfOthers,
} from './fields';
import { formatToE164, splitPhoneNumber } from '@/lib/validation/phone';

describe('getMissingRequiredFields', () => {
  it('lists labels of required fields left empty', () => {
    const missing = getMissingRequiredFields('individual', { fullName: 'A Farmer' });
    expect(missing).toContain('Fayda ID');
    expect(missing).toContain('Contact Number');
    expect(missing).not.toContain('Full Name');
  });

  it('skips a field named in hiddenFields even when empty', () => {
    const missing = getMissingRequiredFields('individual', {}, ['fullName']);
    expect(missing).not.toContain('Full Name');
  });

  it('treats a whitespace-only value the same as empty', () => {
    const missing = getMissingRequiredFields('individual', { fullName: '   ' });
    expect(missing).toContain('Full Name');
  });

  it('returns nothing for an unknown submitter type', () => {
    expect(getMissingRequiredFields('not-a-real-type', {})).toEqual([]);
  });
});

describe('getFieldFormatErrors', () => {
  it('accepts a well-formed 16-digit Fayda ID', () => {
    expect(getFieldFormatErrors('individual', { faydaId: '1234567890123456' })).toEqual([]);
  });

  it('rejects a Fayda ID shorter than 16 digits', () => {
    const errors = getFieldFormatErrors('individual', { faydaId: '123456789012345' });
    expect(errors.some((e) => e.includes('Fayda ID'))).toBe(true);
  });

  it('rejects a Fayda ID longer than 16 digits', () => {
    const errors = getFieldFormatErrors('individual', { faydaId: '12345678901234567' });
    expect(errors.some((e) => e.includes('Fayda ID'))).toBe(true);
  });

  it('rejects a Fayda ID with non-digit characters', () => {
    const errors = getFieldFormatErrors('individual', { faydaId: '1234-5678-9012-34' });
    expect(errors.some((e) => e.includes('Fayda ID'))).toBe(true);
  });

  it('checks representativeFaydaId / officialFaydaId under the same rule as faydaId', () => {
    expect(getFieldFormatErrors('cooperative', { representativeFaydaId: 'ab' }).length).toBe(1);
    expect(getFieldFormatErrors('woreda_kebele', { officialFaydaId: '1234567890123456' }).length).toBe(0);
  });

  it('validates registrationNumber only for the types that collect it', () => {
    expect(getFieldFormatErrors('cooperative', { registrationNumber: '!!' }).length).toBe(1);
    expect(getFieldFormatErrors('cooperative', { registrationNumber: 'COOP-2024-001' }).length).toBe(0);
    // individual has no registrationNumber field at all - an arbitrary value under that key is ignored, not validated
    expect(getFieldFormatErrors('individual', { registrationNumber: '!!' })).toEqual([]);
  });

  it('validates email format when a value is present', () => {
    expect(getFieldFormatErrors('individual', { email: 'not-an-email' }).length).toBe(1);
    expect(getFieldFormatErrors('individual', { email: 'farmer@example.com' })).toEqual([]);
  });

  it('validates phoneNumber against the same Ethiopian-mobile rule the account step uses', () => {
    expect(getFieldFormatErrors('individual', { phoneNumber: '123' }).length).toBe(1);
    expect(getFieldFormatErrors('individual', { phoneNumber: '0912345678' })).toEqual([]);
  });

  it('rejects a 10-digit number that only looks plausible — the exact shape a backend rejection named', () => {
    // +2515454444444 (this local part with +251 prepended) is what
    // oan_grievance_service's normalise_mobile actually rejected in practice —
    // this was accepted here until the rule matched the backend's.
    expect(getFieldFormatErrors('individual', { phoneNumber: '5454444444' }).length).toBe(1);
  });

  it('also accepts phoneNumber in E.164 form, the shape a live account prefills it in', () => {
    // Submit Grievance Step 1 seeds phoneNumber straight from user.mobile_no
    // for a signed-in user - rejecting that shape would block every
    // returning user on a field they never typed.
    expect(getFieldFormatErrors('individual', { phoneNumber: '+251912345678' })).toEqual([]);
    expect(getFieldFormatErrors('individual', { phoneNumber: '+1234' }).length).toBe(1);
  });

  it('skips an empty optional field rather than reporting it as invalid', () => {
    expect(getFieldFormatErrors('individual', { email: '' })).toEqual([]);
    expect(getFieldFormatErrors('individual', {})).toEqual([]);
  });

  it('skips a field named in hiddenFields even if its value is malformed', () => {
    expect(getFieldFormatErrors('individual', { faydaId: 'ab' }, ['faydaId'])).toEqual([]);
  });

  it('returns nothing for an unknown submitter type', () => {
    expect(getFieldFormatErrors('not-a-real-type', { faydaId: 'ab' })).toEqual([]);
  });
});

describe('submitsOnBehalfOfOthers', () => {
  it('is true only for the Development Agent type', () => {
    expect(submitsOnBehalfOfOthers('development_agent')).toBe(true);
    for (const type of ['individual', 'cooperative', 'ngo', 'woreda_kebele', '', 'not-a-real-type']) {
      expect(submitsOnBehalfOfOthers(type)).toBe(false);
    }
  });
});

describe('getFieldError / getFieldErrors (the message shown under a field)', () => {
  it('says a required field is required, using the caller’s wording when given', () => {
    expect(getFieldError('individual', 'faydaId', {})).toBe(DEFAULT_REQUIRED_MESSAGE);
    expect(getFieldError('individual', 'faydaId', {}, [], 'Lo campo è obbligatorio.')).toBe('Lo campo è obbligatorio.');
    expect(getFieldError('individual', 'faydaId', { faydaId: '   ' })).toBe(DEFAULT_REQUIRED_MESSAGE);
  });

  it('explains what a malformed value should look like', () => {
    expect(getFieldError('individual', 'faydaId', { faydaId: 'ab' })).toBe(
      'Enter a valid Fayda ID: exactly 16 digits.'
    );
    expect(getFieldError('cooperative', 'registrationNumber', { registrationNumber: '!!' })).toMatch(/3-60 letters or numbers/);
    expect(getFieldError('individual', 'email', { email: 'nope' })).toBe('Enter a valid email address, e.g. name@example.com.');
    expect(getFieldError('individual', 'phoneNumber', { phoneNumber: '123' })).toMatch(/valid Ethiopian mobile number/);
  });

  it('is fine with a valid value, an empty optional field, a hidden field, or a field the type does not have', () => {
    expect(getFieldError('individual', 'faydaId', { faydaId: '1234567890123456' })).toBeNull();
    expect(getFieldError('individual', 'email', {})).toBeNull();
    expect(getFieldError('individual', 'fullName', {}, ['fullName'])).toBeNull();
    expect(getFieldError('individual', 'orgName', {})).toBeNull();
  });

  it('checks the Development Agent form’s farmer fields', () => {
    expect(getFieldErrors('development_agent', {})).toEqual({
      farmerName: DEFAULT_REQUIRED_MESSAGE,
      faydaId: DEFAULT_REQUIRED_MESSAGE,
      phoneNumber: DEFAULT_REQUIRED_MESSAGE,
    });
  });

  it('collects every failing field of a type, keyed by field, in form order', () => {
    const errors = getFieldErrors('individual', { fullName: 'A Farmer', faydaId: 'x', email: 'bad' });
    expect(Object.keys(errors)).toEqual(['faydaId', 'phoneNumber', 'email']);
  });

  it('agrees with the summary-list functions about which fields are wrong', () => {
    // The inline message and the "Field (hint)" list must never disagree about what is valid.
    const values = { fullName: 'A', faydaId: 'x', phoneNumber: '1', email: 'bad' };
    const inline = Object.keys(getFieldErrors('individual', values));
    const summary = [
      ...getMissingRequiredFields('individual', values),
      ...getFieldFormatErrors('individual', values),
    ];
    expect(inline).toHaveLength(summary.length);
  });

  it('returns nothing for an unknown submitter type', () => {
    expect(getFieldErrors('not-a-real-type', {})).toEqual({});
  });
});

describe('splitPhoneNumber', () => {
  it('splits +251 E.164 phone into dial code and subscriber digits', () => {
    expect(splitPhoneNumber('+251911234567')).toEqual({
      phoneCode: '+251',
      phoneNumber: '911234567',
    });
  });

  it('splits +1 US phone into dial code and subscriber digits', () => {
    expect(splitPhoneNumber('+12025550123')).toEqual({
      phoneCode: '+1',
      phoneNumber: '2025550123',
    });
  });

  it('handles domestic numbers without country code', () => {
    expect(splitPhoneNumber('0911234567')).toEqual({
      phoneCode: '+251',
      phoneNumber: '0911234567',
    });
  });

  it('handles empty or undefined phone', () => {
    expect(splitPhoneNumber('')).toEqual({
      phoneCode: '+251',
      phoneNumber: '',
    });
    expect(splitPhoneNumber(undefined)).toEqual({
      phoneCode: '+251',
      phoneNumber: '',
    });
  });
});

describe('formatToE164', () => {
  it('combines domestic number with leading zero and +251 country code', () => {
    expect(formatToE164('0911234567', '+251')).toBe('+251911234567');
  });

  it('combines 9-digit subscriber number with +251 country code', () => {
    expect(formatToE164('911234567', '+251')).toBe('+251911234567');
  });

  it('leaves already valid E.164 number untouched', () => {
    expect(formatToE164('+251911234567', '+251')).toBe('+251911234567');
  });

  it('handles country code typed into number input', () => {
    expect(formatToE164('251911234567', '+251')).toBe('+251911234567');
  });

  it('returns empty string for empty input', () => {
    expect(formatToE164('')).toBe('');
    expect(formatToE164(undefined)).toBe('');
  });
});
