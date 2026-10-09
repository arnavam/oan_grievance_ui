import { describe, expect, it } from 'vitest';
import { backendSubmitterTypeFor, isRegistrableSubmitterType } from './submitterType';

describe('backendSubmitterTypeFor', () => {
  it("maps a Development Agent to the backend's name for it", () => {
    expect(backendSubmitterTypeFor('development_agent')).toBe('Development Agent');
  });

  it('leaves every other type to the backend default', () => {
    // Individual Farmer is the default; the organisation types need a
    // registration number that registration does not send.
    for (const type of ['individual', 'cooperative', 'ngo', 'woreda_kebele', '', 'unknown']) {
      expect(backendSubmitterTypeFor(type)).toBeUndefined();
    }
  });
});

describe('isRegistrableSubmitterType', () => {
  it('accepts only names the register form actually sends', () => {
    expect(isRegistrableSubmitterType('Development Agent')).toBe(true);
    for (const value of ['Individual Farmer', 'Cooperative', 'development_agent', '', undefined, null, 1]) {
      expect(isRegistrableSubmitterType(value)).toBe(false);
    }
  });
});
