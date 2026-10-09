import { describe, expect, it } from 'vitest';
import {
  canAccessRoute,
  canViewAllGrievances,
  homeRouteForRoles,
  isOfficerOrAdmin,
  isProtectedRoute,
  isPublicRoute,
  ROLES,
} from './rbac';

const ALL_ROLES = [ROLES.SUBMITTER, ROLES.OFFICER, ROLES.ADMIN, ROLES.REVIEW_OFFICER];

describe('isPublicRoute / isProtectedRoute', () => {
  it('treats /login, /register and /reset-password (and their sub-paths) as public', () => {
    expect(isPublicRoute('/login')).toBe(true);
    expect(isPublicRoute('/login/whatever')).toBe(true);
    expect(isPublicRoute('/register')).toBe(true);
    expect(isPublicRoute('/reset-password')).toBe(true);
  });

  it('does not treat a route that merely starts with the same characters as public', () => {
    expect(isPublicRoute('/login-history')).toBe(false);
  });

  it('is the exact inverse of isProtectedRoute', () => {
    for (const path of ['/login', '/register', '/dashboard', '/submit-grievance', '/']) {
      expect(isProtectedRoute(path)).toBe(!isPublicRoute(path));
    }
  });
});

describe('canAccessRoute — deny-by-default', () => {
  it('denies a route that is in neither ROUTE_ROLES nor the unrestricted list, for every role', () => {
    for (const role of [...ALL_ROLES, 'Some Future Role']) {
      expect(canAccessRoute('/some-future-page-nobody-added-yet', [role])).toBe(false);
    }
  });

  it('always allows /no-access, regardless of role', () => {
    expect(canAccessRoute('/no-access', [])).toBe(true);
    expect(canAccessRoute('/no-access', ['Anything At All'])).toBe(true);
    for (const role of ALL_ROLES) expect(canAccessRoute('/no-access', [role])).toBe(true);
  });
});

describe('canAccessRoute — per-role gates', () => {
  it('/submit-grievance is Submitter-only', () => {
    expect(canAccessRoute('/submit-grievance', [ROLES.SUBMITTER])).toBe(true);
    expect(canAccessRoute('/submit-grievance', [ROLES.OFFICER])).toBe(false);
    expect(canAccessRoute('/submit-grievance', [ROLES.ADMIN])).toBe(false);
  });

  it('/dashboard is Officer/Admin only — Review Officer is not granted dashboard charts (PR #47)', () => {
    expect(canAccessRoute('/dashboard', [ROLES.OFFICER])).toBe(true);
    expect(canAccessRoute('/dashboard', [ROLES.ADMIN])).toBe(true);
    expect(canAccessRoute('/dashboard', [ROLES.SUBMITTER])).toBe(false);
    expect(canAccessRoute('/dashboard', [ROLES.REVIEW_OFFICER])).toBe(false);
  });

  it('/user-management and /administration admit Admin and Review Officer (read-only) but not Officer/Submitter', () => {
    for (const path of ['/user-management', '/administration']) {
      expect(canAccessRoute(path, [ROLES.ADMIN])).toBe(true);
      expect(canAccessRoute(path, [ROLES.REVIEW_OFFICER])).toBe(true);
      expect(canAccessRoute(path, [ROLES.OFFICER])).toBe(false);
      expect(canAccessRoute(path, [ROLES.SUBMITTER])).toBe(false);
    }
  });

  it('/all-grievances and /grievances are open to all four roles', () => {
    for (const path of ['/all-grievances', '/grievances']) {
      for (const role of ALL_ROLES) expect(canAccessRoute(path, [role])).toBe(true);
    }
  });

  it('matches a sub-path (e.g. /dashboard/data) under its parent route entry', () => {
    expect(canAccessRoute('/dashboard/data', [ROLES.ADMIN])).toBe(true);
    expect(canAccessRoute('/dashboard/data', [ROLES.SUBMITTER])).toBe(false);
  });

  it('an empty roles array is treated as Submitter-equivalent', () => {
    expect(canAccessRoute('/submit-grievance', [])).toBe(true);
    expect(canAccessRoute('/dashboard', [])).toBe(false);
  });

  it('an unrecognized non-empty role is denied everywhere except the unrestricted list', () => {
    expect(canAccessRoute('/submit-grievance', ['Made Up Role'])).toBe(false);
    expect(canAccessRoute('/dashboard', ['Made Up Role'])).toBe(false);
    expect(canAccessRoute('/all-grievances', ['Made Up Role'])).toBe(false);
  });
});

describe('homeRouteForRoles', () => {
  it('routes each known role to its documented home', () => {
    expect(homeRouteForRoles([ROLES.SUBMITTER])).toBe('/submit-grievance');
    expect(homeRouteForRoles([ROLES.OFFICER])).toBe('/all-grievances');
    expect(homeRouteForRoles([ROLES.ADMIN])).toBe('/dashboard');
    expect(homeRouteForRoles([ROLES.REVIEW_OFFICER])).toBe('/all-grievances');
  });

  it('picks the highest-privilege role home route for a multi-role user', () => {
    expect(homeRouteForRoles([ROLES.SUBMITTER, ROLES.ADMIN])).toBe('/dashboard');
    expect(homeRouteForRoles([ROLES.SUBMITTER, ROLES.OFFICER])).toBe('/all-grievances');
  });

  it('treats an empty roles array as Submitter', () => {
    expect(homeRouteForRoles([])).toBe('/submit-grievance');
  });

  it('falls back to /no-access for a role that matches nothing known', () => {
    expect(homeRouteForRoles(['Some Future Role'])).toBe('/no-access');
  });

  /**
   * The load-bearing invariant: whatever home route a role lands on must
   * itself be reachable by that same role, or proxy.ts bounces it forever
   * (that's exactly the bug this suite would have caught before it shipped —
   * /dashboard became Officer/Admin-only in the same PR that left
   * DEFAULT_HOME_ROUTE pointed at it).
   */
  it('every known role\'s home route is one that role can actually access', () => {
    for (const role of ALL_ROLES) {
      const home = homeRouteForRoles([role]);
      expect(canAccessRoute(home, [role])).toBe(true);
    }
  });

  it('the fallback home route for an unrecognized role is itself reachable by that role', () => {
    const unrecognizedRoles = ['Some Future Role'];
    const home = homeRouteForRoles(unrecognizedRoles);
    expect(canAccessRoute(home, unrecognizedRoles)).toBe(true);
  });
});

describe('isOfficerOrAdmin', () => {
  it('is true for Officer and Admin, false for Submitter, Review Officer, and empty/unknown roles', () => {
    expect(isOfficerOrAdmin([ROLES.OFFICER])).toBe(true);
    expect(isOfficerOrAdmin([ROLES.ADMIN])).toBe(true);
    expect(isOfficerOrAdmin([ROLES.SUBMITTER])).toBe(false);
    expect(isOfficerOrAdmin([ROLES.REVIEW_OFFICER])).toBe(false);
    expect(isOfficerOrAdmin([])).toBe(false);
    expect(isOfficerOrAdmin(['Some Future Role'])).toBe(false);
  });
});

describe('canViewAllGrievances', () => {
  it('is true for Officer, Admin, and Review Officer — the three roles PR #47 lets read every case', () => {
    expect(canViewAllGrievances([ROLES.OFFICER])).toBe(true);
    expect(canViewAllGrievances([ROLES.ADMIN])).toBe(true);
    expect(canViewAllGrievances([ROLES.REVIEW_OFFICER])).toBe(true);
  });

  it('is false for Submitter and empty/unknown roles, same as isOfficerOrAdmin', () => {
    expect(canViewAllGrievances([ROLES.SUBMITTER])).toBe(false);
    expect(canViewAllGrievances([])).toBe(false);
    expect(canViewAllGrievances(['Some Future Role'])).toBe(false);
  });

  it('differs from isOfficerOrAdmin exactly on Review Officer — the whole reason it exists', () => {
    expect(canViewAllGrievances([ROLES.REVIEW_OFFICER])).not.toBe(isOfficerOrAdmin([ROLES.REVIEW_OFFICER]));
  });
});
