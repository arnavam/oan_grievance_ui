import { afterEach, describe, expect, it } from 'vitest';
import { getClientIp, hasTrustedProxyConfigured, UNKNOWN_CLIENT_IP } from './clientIp';

const ORIGINAL_HOPS = process.env.TRUSTED_PROXY_HOPS;

afterEach(() => {
  if (ORIGINAL_HOPS === undefined) delete process.env.TRUSTED_PROXY_HOPS;
  else process.env.TRUSTED_PROXY_HOPS = ORIGINAL_HOPS;
});

function requestWith(headers: Record<string, string>): Request {
  return new Request('http://localhost/api/whatever', { headers });
}

describe('getClientIp — TRUSTED_PROXY_HOPS unset or 0 (the documented default)', () => {
  it('returns the constant "unknown" regardless of any forwarding headers present', () => {
    delete process.env.TRUSTED_PROXY_HOPS;
    expect(getClientIp(requestWith({ 'x-forwarded-for': '1.2.3.4' }))).toBe(UNKNOWN_CLIENT_IP);
    expect(getClientIp(requestWith({ 'x-real-ip': '1.2.3.4' }))).toBe(UNKNOWN_CLIENT_IP);
    expect(getClientIp(requestWith({}))).toBe(UNKNOWN_CLIENT_IP);
  });

  it('also returns "unknown" for an explicit 0', () => {
    process.env.TRUSTED_PROXY_HOPS = '0';
    expect(getClientIp(requestWith({ 'x-forwarded-for': '1.2.3.4' }))).toBe(UNKNOWN_CLIENT_IP);
  });

  it('treats invalid values (negative, non-numeric) the same as unset — never trusts an unparseable config', () => {
    for (const invalid of ['-1', 'not-a-number', '']) {
      process.env.TRUSTED_PROXY_HOPS = invalid;
      expect(getClientIp(requestWith({ 'x-forwarded-for': '1.2.3.4' }))).toBe(UNKNOWN_CLIENT_IP);
    }
  });
});

describe('getClientIp — TRUSTED_PROXY_HOPS configured', () => {
  it('picks the entry that many hops from the right of X-Forwarded-For', () => {
    process.env.TRUSTED_PROXY_HOPS = '1';
    // client, proxy1 — with 1 trusted hop, the rightmost entry is the proxy's
    // own view of the client, i.e. the second-to-last... actually the single
    // trusted-hop case takes the last entry (closest proxy's own client view).
    expect(getClientIp(requestWith({ 'x-forwarded-for': '203.0.113.5' }))).toBe('203.0.113.5');
  });

  it('with 2 trusted hops, picks the second-from-right entry', () => {
    process.env.TRUSTED_PROXY_HOPS = '2';
    expect(getClientIp(requestWith({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1' }))).toBe('203.0.113.5');
  });

  it('clamps to MAX_TRUSTED_PROXY_HOPS (4) even if configured higher', () => {
    process.env.TRUSTED_PROXY_HOPS = '100';
    // 5-entry chain; hops clamped to 4, so it should pick index (5-4)=1, not blow up or read out of bounds.
    const chain = ['a', 'b', 'c', 'd', 'e'].join(', ');
    const result = getClientIp(requestWith({ 'x-forwarded-for': chain }));
    expect(result).toBe('b');
  });

  it('falls back to the nearest hop when the chain is shorter than configured hops', () => {
    process.env.TRUSTED_PROXY_HOPS = '3';
    expect(getClientIp(requestWith({ 'x-forwarded-for': '203.0.113.5' }))).toBe('203.0.113.5');
  });

  it('falls back to X-Real-IP when X-Forwarded-For is absent', () => {
    process.env.TRUSTED_PROXY_HOPS = '1';
    expect(getClientIp(requestWith({ 'x-real-ip': '198.51.100.7' }))).toBe('198.51.100.7');
  });

  it('returns "unknown" when neither header is present, even with hops configured', () => {
    process.env.TRUSTED_PROXY_HOPS = '1';
    expect(getClientIp(requestWith({}))).toBe(UNKNOWN_CLIENT_IP);
  });
});

describe('hasTrustedProxyConfigured', () => {
  it('is false when TRUSTED_PROXY_HOPS is unset, 0, or invalid — same cases getClientIp treats as untrusted', () => {
    for (const value of [undefined, '0', '-1', 'not-a-number', '']) {
      if (value === undefined) delete process.env.TRUSTED_PROXY_HOPS;
      else process.env.TRUSTED_PROXY_HOPS = value;
      expect(hasTrustedProxyConfigured()).toBe(false);
    }
  });

  it('is true whenever TRUSTED_PROXY_HOPS is a positive integer, regardless of any given request', () => {
    process.env.TRUSTED_PROXY_HOPS = '2';
    expect(hasTrustedProxyConfigured()).toBe(true);
    // Deployment-wide, not request-shaped — stays true even for a request
    // that itself resolves to UNKNOWN_CLIENT_IP (a missing header on one
    // particular request doesn't mean the deployment stopped trusting its
    // proxy). This is exactly the distinction register/route.ts relies on to
    // avoid widening its rate limit for a request like this one.
    expect(getClientIp(requestWith({}))).toBe(UNKNOWN_CLIENT_IP);
    expect(hasTrustedProxyConfigured()).toBe(true);
  });
});
