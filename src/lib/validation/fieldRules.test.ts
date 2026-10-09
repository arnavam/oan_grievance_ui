import { describe, expect, it } from 'vitest';
import {
  EMAIL_MAX_LENGTH,
  FULL_NAME_MAX_LENGTH,
  validateAccount,
  validateAccountField,
  validateEmail,
  validateFullName,
  validateLocalPhone,
  validateLoginPassword,
  validateNewPassword,
  validateOptionalLocalPhone,
  validatePasswordConfirmation,
  validateRequired,
  validateTemporaryPassword,
} from './fieldRules';

describe('validateEmail', () => {
  it('accepts an ordinary address, ignoring surrounding spaces', () => {
    expect(validateEmail('abebe@example.com')).toBeNull();
    expect(validateEmail('  abebe@example.com  ')).toBeNull();
  });

  it('asks for an address when blank', () => {
    expect(validateEmail('')).toBe('Enter your email address.');
    expect(validateEmail('   ')).toBe('Enter your email address.');
  });

  it('rejects the shapes the browser’s own email check lets through or that are plainly wrong', () => {
    for (const bad of ['abebe', 'abebe@', '@example.com', 'abebe@example', 'a b@example.com', 'a@@example.com']) {
      expect(validateEmail(bad), bad).toBe('Enter a valid email address, e.g. name@example.com.');
    }
  });

  it('rejects an address longer than an email can be', () => {
    const long = `${'a'.repeat(EMAIL_MAX_LENGTH)}@example.com`;
    expect(validateEmail(long)).toMatch(/valid email/);
  });
});

describe('validateFullName', () => {
  it('requires a name that is not just spaces', () => {
    expect(validateFullName('')).toBe('Enter your full name.');
    expect(validateFullName('    ')).toBe('Enter your full name.');
    expect(validateFullName('Abebe Bikila')).toBeNull();
  });

  it("enforces the backend's 140-character limit on the trimmed name", () => {
    expect(validateFullName('A'.repeat(FULL_NAME_MAX_LENGTH))).toBeNull();
    expect(validateFullName(` ${'A'.repeat(FULL_NAME_MAX_LENGTH)} `)).toBeNull();
    expect(validateFullName('A'.repeat(FULL_NAME_MAX_LENGTH + 1))).toBe(
      'Full name must be 140 characters or fewer.'
    );
  });
});

describe('validateLocalPhone', () => {
  const ETHIOPIA = '+251';
  const ETHIOPIA_INVALID_MESSAGE = 'Enter a valid Ethiopian mobile number, e.g. 0911234567 or 911234567 (starts with 09, 07, 9, or 7).';
  const GENERIC_INVALID_MESSAGE = 'Enter a valid phone number for the selected country.';

  it('asks for a number when blank, whatever country is selected', () => {
    expect(validateLocalPhone('', ETHIOPIA)).toBe('Enter your phone number.');
    expect(validateLocalPhone('', '+254')).toBe('Enter your phone number.');
  });

  describe('Ethiopia (+251) — the backend has a real rule for this one', () => {
    it('requires 9 or 10 digits starting with valid prefix', () => {
      expect(validateLocalPhone('09110000', ETHIOPIA)).toBe(ETHIOPIA_INVALID_MESSAGE); // 8 digits (too short)
      expect(validateLocalPhone('09110000000', ETHIOPIA)).toBe(ETHIOPIA_INVALID_MESSAGE); // 11 digits (too long)
      expect(validateLocalPhone('9110000', ETHIOPIA)).toBe(ETHIOPIA_INVALID_MESSAGE); // 7 digits
    });

    it('accepts both 10-digit (domestic trunk 0) and 9-digit (national significant) Ethiopian mobile numbers', () => {
      // 10 digits (with domestic trunk 0)
      expect(validateLocalPhone('0911000000', ETHIOPIA)).toBeNull();
      expect(validateLocalPhone('0711000000', ETHIOPIA)).toBeNull();

      // 9 digits (national significant number without 0)
      expect(validateLocalPhone('911000000', ETHIOPIA)).toBeNull();
      expect(validateLocalPhone('711000000', ETHIOPIA)).toBeNull();
    });

    it("rejects numbers that do not match the Ethiopian mobile prefix rules", () => {
      expect(validateLocalPhone('5454444444', ETHIOPIA)).toBe(ETHIOPIA_INVALID_MESSAGE); // 10 digits, starts 5
      expect(validateLocalPhone('545444444', ETHIOPIA)).toBe(ETHIOPIA_INVALID_MESSAGE); // 9 digits, starts 5
      expect(validateLocalPhone('0811234567', ETHIOPIA)).toBe(ETHIOPIA_INVALID_MESSAGE); // leading 0, but starts 08 not 09/07
      expect(validateLocalPhone('811234567', ETHIOPIA)).toBe(ETHIOPIA_INVALID_MESSAGE); // 9 digits, starts 8
      expect(validateLocalPhone('0011234567', ETHIOPIA)).toBe(ETHIOPIA_INVALID_MESSAGE); // leading 0, but starts 00
    });
  });

  describe('any other country — the backend has no real rule yet, so this only rules out the obviously wrong', () => {
    it('accepts the exact shape Ethiopia would reject, once a non-Ethiopian country is selected', () => {
      // Same digits that fail the Ethiopia-specific test above.
      expect(validateLocalPhone('5454444444', '+254')).toBeNull();
      expect(validateLocalPhone('0811234567', '+1')).toBeNull();
    });

    it('still rejects something that is clearly not a phone number', () => {
      expect(validateLocalPhone('123', '+254')).toBe(GENERIC_INVALID_MESSAGE); // too short
      expect(validateLocalPhone('1'.repeat(15), '+254')).toBe(GENERIC_INVALID_MESSAGE); // too long
      expect(validateLocalPhone('abc1234567', '+254')).toBe(GENERIC_INVALID_MESSAGE); // not digits
    });
  });
});

describe('validateTemporaryPassword', () => {
  it('requires a value, unlike validateOptionalLocalPhone', () => {
    expect(validateTemporaryPassword('')).toBe('Enter a temporary password.');
  });

  it('accepts 8+ characters with a letter and a number — no symbol required', () => {
    expect(validateTemporaryPassword('Welcome2026')).toBeNull();
  });

  it('rejects too short, letter-only, or digit-only values', () => {
    expect(validateTemporaryPassword('Ab1')).toBe('Password must be at least 8 characters.');
    expect(validateTemporaryPassword('aaaaaaaa')).toBe('Password must contain at least one letter and one number.');
    expect(validateTemporaryPassword('12345678')).toBe('Password must contain at least one letter and one number.');
  });
});

describe('validateOptionalLocalPhone', () => {
  it('is fine left blank, unlike validateLocalPhone', () => {
    expect(validateOptionalLocalPhone('', '+251')).toBeNull();
  });

  it('still enforces the same per-country shape once something is typed', () => {
    expect(validateOptionalLocalPhone('911000000', '+251')).toBeNull();
    expect(validateOptionalLocalPhone('123', '+251')).toBe(
      'Enter a valid Ethiopian mobile number, e.g. 0911234567 or 911234567 (starts with 09, 07, 9, or 7).'
    );
  });
});

describe('password rules', () => {
  it('validateNewPassword reports the first unmet rule, or asks for one when blank', () => {
    expect(validateNewPassword('')).toBe('Enter a password.');
    expect(validateNewPassword('short1!')).toBe('Password must be between 8 and 64 characters long.');
    expect(validateNewPassword('abcdefgh1')).toBe('Password must contain at least 1 special character.');
    expect(validateNewPassword('Str0ng!Passw0rd')).toBeNull();
  });

  it('validatePasswordConfirmation asks for it, then checks it matches', () => {
    expect(validatePasswordConfirmation('Str0ng!Passw0rd', '')).toBe('Re-enter your password to confirm it.');
    expect(validatePasswordConfirmation('Str0ng!Passw0rd', 'other')).toBe('Passwords do not match.');
    expect(validatePasswordConfirmation('Str0ng!Passw0rd', 'Str0ng!Passw0rd')).toBeNull();
  });

  it('validateLoginPassword checks presence only, never strength', () => {
    expect(validateLoginPassword('')).toBe('Enter your password.');
    // An old, weak password must still be allowed through to the backend, and the policy not hinted at.
    expect(validateLoginPassword('abc')).toBeNull();
  });
});

describe('validateRequired', () => {
  it('returns the given message for blank or whitespace-only text', () => {
    expect(validateRequired('', 'Needed.')).toBe('Needed.');
    expect(validateRequired('  ', 'Needed.')).toBe('Needed.');
    expect(validateRequired('x', 'Needed.')).toBeNull();
  });
});

describe('account step validation', () => {
  const valid = {
    fullName: 'Abebe Bikila',
    email: 'abebe@example.com',
    phoneNumber: '0911000000',
    password: 'Str0ng!Passw0rd',
    confirmPassword: 'Str0ng!Passw0rd',
    countryCode: '+251',
  };

  it('finds nothing wrong with a valid account', () => {
    expect(validateAccount(valid)).toEqual({});
  });

  it('reports every failing field, keyed by field, in form order', () => {
    const errors = validateAccount({
      fullName: '',
      email: 'nope',
      phoneNumber: '1',
      password: '',
      confirmPassword: '',
      countryCode: '+251',
    });
    expect(Object.keys(errors)).toEqual(['fullName', 'email', 'phoneNumber', 'password', 'confirmPassword']);
  });

  it('checks the phone number against whichever country is selected', () => {
    expect(validateAccountField('phoneNumber', { ...valid, phoneNumber: '5454444444', countryCode: '+251' })).toMatch(
      /Ethiopian mobile/
    );
    expect(validateAccountField('phoneNumber', { ...valid, phoneNumber: '5454444444', countryCode: '+254' })).toBeNull();
  });

  it('checks a confirmation against the password it is given alongside', () => {
    expect(validateAccountField('confirmPassword', { ...valid, confirmPassword: 'x' })).toBe('Passwords do not match.');
    expect(validateAccountField('confirmPassword', { ...valid, password: 'x', confirmPassword: 'x' })).toBeNull();
  });
});
