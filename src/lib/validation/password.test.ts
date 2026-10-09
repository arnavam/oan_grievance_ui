import { describe, expect, it } from 'vitest';
import { generateRandomPassword, validatePassword } from './password';

describe('generateRandomPassword', () => {
  it('always satisfies validatePassword, across many runs', () => {
    for (let i = 0; i < 50; i++) {
      expect(validatePassword(generateRandomPassword())).toBeNull();
    }
  });

  it('honors a custom length', () => {
    expect(generateRandomPassword(20)).toHaveLength(20);
  });

  it('is not the same password twice in a row', () => {
    expect(generateRandomPassword()).not.toBe(generateRandomPassword());
  });

  it('never includes visually-confusable characters', () => {
    for (let i = 0; i < 20; i++) {
      expect(generateRandomPassword()).not.toMatch(/[0O1lI]/);
    }
  });
});
