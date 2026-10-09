// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSubmitterProfile, loadSubmitterProfile, saveSubmitterProfile } from './submitterProfile';

const EMAIL = 'test@example.com';
const STORAGE_KEY = 'oan_submitter_profile:test@example.com';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('saveSubmitterProfile / loadSubmitterProfile', () => {
  it('round-trips a profile', () => {
    saveSubmitterProfile(EMAIL, { submitterType: 'individual', identityValues: { fullName: 'A Farmer' } });
    expect(loadSubmitterProfile(EMAIL)).toEqual({
      submitterType: 'individual',
      identityValues: { fullName: 'A Farmer' },
    });
  });

  it('persists national-ID field variants along with the rest of identityValues', () => {
    for (const idKey of ['faydaId', 'representativeFaydaId', 'officialFaydaId']) {
      localStorage.clear();
      saveSubmitterProfile(EMAIL, {
        submitterType: 'individual',
        identityValues: { fullName: 'A Farmer', [idKey]: '1234-5678-9012' },
      });

      const loaded = loadSubmitterProfile(EMAIL);
      expect(loaded?.identityValues[idKey]).toBe('1234-5678-9012');
      expect(loaded?.identityValues.fullName).toBe('A Farmer');
    }
  });

  it('returns null and clears storage for an entry older than the TTL', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    saveSubmitterProfile(EMAIL, { submitterType: 'individual', identityValues: { fullName: 'A Farmer' } });

    vi.setSystemTime(new Date('2026-01-03T00:00:00Z')); // 2 days later, past the 24h TTL
    expect(loadSubmitterProfile(EMAIL)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('returns the profile when read just under the TTL', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    saveSubmitterProfile(EMAIL, { submitterType: 'individual', identityValues: { fullName: 'A Farmer' } });

    vi.setSystemTime(new Date('2026-01-01T23:00:00Z')); // 23h later, still within the 24h TTL
    expect(loadSubmitterProfile(EMAIL)).not.toBeNull();
  });

  it('returns null and clears storage for a value that does not match the expected shape', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ unexpected: 'shape' }));
    expect(loadSubmitterProfile(EMAIL)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('returns null for malformed JSON rather than throwing', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');
    expect(() => loadSubmitterProfile(EMAIL)).not.toThrow();
    expect(loadSubmitterProfile(EMAIL)).toBeNull();
  });

  it('returns null when nothing is stored for that email', () => {
    expect(loadSubmitterProfile('nobody@example.com')).toBeNull();
  });

  it('keys are case-insensitive on email', () => {
    saveSubmitterProfile('Test@Example.com', { submitterType: 'individual', identityValues: {} });
    expect(loadSubmitterProfile('test@example.com')).not.toBeNull();
  });
});

describe('clearSubmitterProfile', () => {
  it('removes only the given email\'s entry', () => {
    saveSubmitterProfile(EMAIL, { submitterType: 'individual', identityValues: {} });
    saveSubmitterProfile('other@example.com', { submitterType: 'ngo', identityValues: {} });

    clearSubmitterProfile(EMAIL);

    expect(loadSubmitterProfile(EMAIL)).toBeNull();
    expect(loadSubmitterProfile('other@example.com')).not.toBeNull();
  });
});
