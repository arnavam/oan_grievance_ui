import { NextResponse } from 'next/server';
import { describe, expect, it } from 'vitest';
import {
  clearActivityCookie,
  hasRecentActivity,
  isIdleExpired,
  LAST_ACTIVITY_COOKIE,
  touchActivityCookie,
} from './idleSession';

function requestWithCookie(value: string | undefined) {
  return {
    cookies: {
      get(name: string) {
        if (name !== LAST_ACTIVITY_COOKIE || value === undefined) return undefined;
        return { value };
      },
    },
  };
}

describe('hasRecentActivity', () => {
  it('is true when the activity cookie is present with a value', () => {
    expect(hasRecentActivity(requestWithCookie('1'))).toBe(true);
  });

  it('is false when the activity cookie is absent', () => {
    expect(hasRecentActivity(requestWithCookie(undefined))).toBe(false);
  });

  it('is false when the activity cookie is present but empty', () => {
    expect(hasRecentActivity(requestWithCookie(''))).toBe(false);
  });
});

describe('isIdleExpired', () => {
  it('is false when there is no session cookie at all, regardless of activity', () => {
    expect(isIdleExpired(false, requestWithCookie(undefined))).toBe(false);
    expect(isIdleExpired(false, requestWithCookie('1'))).toBe(false);
  });

  it('is false when a session cookie is present and activity is recent', () => {
    expect(isIdleExpired(true, requestWithCookie('1'))).toBe(false);
  });

  it('is true when a session cookie is present but activity has lapsed', () => {
    expect(isIdleExpired(true, requestWithCookie(undefined))).toBe(true);
  });
});

describe('touchActivityCookie / clearActivityCookie', () => {
  it('touchActivityCookie sets the activity cookie with a positive maxAge', () => {
    const response = NextResponse.json({});
    touchActivityCookie(response);
    const cookie = response.cookies.get(LAST_ACTIVITY_COOKIE);
    expect(cookie?.value).toBe('1');
    expect(cookie?.maxAge).toBeGreaterThan(0);
  });

  it('clearActivityCookie sets the activity cookie to expire immediately', () => {
    const response = NextResponse.json({});
    clearActivityCookie(response);
    const cookie = response.cookies.get(LAST_ACTIVITY_COOKIE);
    expect(cookie?.value).toBe('');
    expect(cookie?.maxAge).toBe(0);
  });
});
