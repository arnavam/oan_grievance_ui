import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildRateLimitKey, checkRateLimit, hashForRateLimit } from './rateLimit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests up to the limit within a window', () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, 5, 60_000).allowed).toBe(true);
    }
  });

  it('rejects the request once the count exceeds the limit', () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) checkRateLimit(key, 5, 60_000);
    const result = checkRateLimit(key, 5, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('resets the count once the window has elapsed', () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) checkRateLimit(key, 5, 60_000);
    expect(checkRateLimit(key, 5, 60_000).allowed).toBe(false);

    vi.advanceTimersByTime(60_001);

    expect(checkRateLimit(key, 5, 60_000).allowed).toBe(true);
  });

  it('tracks independent keys separately', () => {
    const keyA = `a-${Math.random()}`;
    const keyB = `b-${Math.random()}`;
    for (let i = 0; i < 5; i++) checkRateLimit(keyA, 5, 60_000);
    expect(checkRateLimit(keyA, 5, 60_000).allowed).toBe(false);
    expect(checkRateLimit(keyB, 5, 60_000).allowed).toBe(true);
  });

  it('retryAfterSeconds counts down toward the window reset, never below 1', () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) checkRateLimit(key, 5, 60_000);
    vi.advanceTimersByTime(59_500);
    const result = checkRateLimit(key, 5, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });
});

describe('hashForRateLimit', () => {
  it('is deterministic for the same input', () => {
    expect(hashForRateLimit('some-refresh-token')).toBe(hashForRateLimit('some-refresh-token'));
  });

  it('differs for different inputs', () => {
    expect(hashForRateLimit('token-a')).not.toBe(hashForRateLimit('token-b'));
  });

  it('never returns the raw input (does not leak the secret)', () => {
    const secret = 'super-secret-refresh-token-value';
    expect(hashForRateLimit(secret)).not.toContain(secret);
  });

  it('returns a fixed-length hex fragment', () => {
    expect(hashForRateLimit('anything')).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe('buildRateLimitKey', () => {
  it('falls back to "none" when no secret or identity is given', () => {
    expect(buildRateLimitKey('login', '1.2.3.4')).toBe('login:1.2.3.4:none');
  });

  it('folds in a lowercased identity as-is', () => {
    expect(buildRateLimitKey('login', '1.2.3.4', { identity: 'User@Example.com' })).toBe(
      'login:1.2.3.4:user@example.com'
    );
  });

  it('hashes a secret rather than embedding it directly', () => {
    const key = buildRateLimitKey('refresh', '1.2.3.4', { secret: 'my-refresh-token' });
    expect(key).not.toContain('my-refresh-token');
    expect(key).toBe(`refresh:1.2.3.4:${hashForRateLimit('my-refresh-token')}`);
  });

  it('prefers secret over identity when both are given', () => {
    const key = buildRateLimitKey('x', '1.2.3.4', { secret: 'token', identity: 'someone@example.com' });
    expect(key).toBe(`x:1.2.3.4:${hashForRateLimit('token')}`);
  });

  it('treats a null or undefined secret/identity the same as omitted', () => {
    expect(buildRateLimitKey('x', '1.2.3.4', { secret: null, identity: null })).toBe('x:1.2.3.4:none');
    expect(buildRateLimitKey('x', '1.2.3.4', { secret: undefined, identity: undefined })).toBe('x:1.2.3.4:none');
  });
});
