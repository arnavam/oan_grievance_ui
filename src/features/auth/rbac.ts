import { ORGANISATION_ROUTE, type OrganisationKind } from '@/lib/organisationKind';

// Exact-or-segment match, not a bare prefix: `/login` matches `/login` and
// `/login/whatever`, but never a route that merely starts with the same
// characters, like a future `/login-history`. The one route-matching rule in
// this file — PUBLIC_ROUTES, UNRESTRICTED_ROUTES, and ROUTE_ROLES's keys are
// all matched through this, rather than each keeping its own copy of the
// same `pathname === route || pathname.startsWith(route + '/')` check.
function matchesRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function findMatchingRoute(pathname: string, routes: readonly string[]): string | undefined {
  return routes.find((route) => matchesRoute(pathname, route));
}

/** The only public routes. Everything else is a dashboard screen that needs a session. */
export const PUBLIC_ROUTES = ['/login', '/register', '/reset-password'];

export function isPublicRoute(pathname: string): boolean {
  return findMatchingRoute(pathname, PUBLIC_ROUTES) !== undefined;
}

/**
 * Public routes that stay open even to an already-authenticated visitor,
 * unlike `/login` and `/register` which proxy.ts bounces an authenticated
 * session away from. A password-reset link can land on someone who's still
 * signed in elsewhere (or in another tab) — they need to reach the reset
 * form itself, not get redirected back to their dashboard before it renders.
 */
const PUBLIC_ROUTES_ALLOWED_WHEN_AUTHENTICATED = ['/reset-password'];

export function isPublicRouteAllowedWhenAuthenticated(pathname: string): boolean {
  return findMatchingRoute(pathname, PUBLIC_ROUTES_ALLOWED_WHEN_AUTHENTICATED) !== undefined;
}

export function isProtectedRoute(pathname: string): boolean {
  return !isPublicRoute(pathname);
}

/**
 * The role strings this app routes by. The first three are confirmed against
 * a live `oan_auth_service` (2026-09-16): Frappe Role records named exactly
 * these exist (via `oan_grievance_service`'s fixtures), and a role assigned
 * through Frappe Desk round-trips correctly through login into this claim.
 *
 * The one confirmed gap: self-registration still assigns no role at all
 * (`jwt_default_registration_role` isn't set on that site's config) — a
 * self-registered user's JWT `roles` claim is `[]`, handled by
 * `effectiveRoles` below as submitter-equivalent until that's configured.
 *
 * `REVIEW_OFFICER` ships in `oan_grievance_service` PR #47 (STG-434), merged
 * to `develop` 2026-10-07. The exact string here is pinned to that PR's own
 * note that the role name is `Grievance Review Officer` (the Jira ticket
 * just says "Review Officer"), and confirmed against the merged
 * `services/constants.py`'s `ROLE_REVIEW_OFFICER`. Not yet confirmed via an
 * actual login, though — no account holding this role exists on the dev
 * bench yet (it's brand new), so re-verify the string once one does, the
 * same way the other three were confirmed above.
 *
 * `ASSISTED_SUBMITTER` files grievances on someone else's behalf (a
 * Development Agent, call-centre or front-desk staff) and has exactly a
 * submitter's authority, so it is granted everything `SUBMITTER` is below.
 * The string matches `oan_grievance_service`'s `ROLE_ASSISTED_SUBMITTER`
 * (formerly `Grievance Development Agent`). It is granted through Keycloak,
 * whose client role must carry this exact name.
 */
export const ROLES = {
  SUBMITTER: 'Grievance Submitter',
  OFFICER: 'Grievance Officer',
  ADMIN: 'Grievance Admin',
  REVIEW_OFFICER: 'Grievance Review Officer',
  ASSISTED_SUBMITTER: 'Grievance Assisted Submitter',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/**
 * Roles each login option admits, keyed by oan_auth_service's option key
 * (`local` is this app's own email/password form). A valid account signing in
 * through the wrong door — a farmer on the agent option, say — is refused
 * server-side. An option not listed here is not restricted, so a newly enabled
 * one never locks everyone out. A user with no roles counts as a submitter,
 * as everywhere else (`effectiveRoles`).
 */
export const PORTAL_ROLES: Record<string, readonly Role[]> = {
  bene: [ROLES.SUBMITTER],
  local: [ROLES.SUBMITTER, ROLES.OFFICER, ROLES.ADMIN, ROLES.REVIEW_OFFICER],
  agent: [ROLES.ASSISTED_SUBMITTER],
  staff: [ROLES.OFFICER, ROLES.ADMIN, ROLES.REVIEW_OFFICER],
};

export function isRoleAllowedForPortal(portal: string, roles: string[]): boolean {
  const allowed = PORTAL_ROLES[portal];
  if (!allowed) return true;
  return effectiveRoles(roles).some((role) => allowed.includes(role as Role));
}

/**
 * Routes open to any authenticated role, whatever it is — deliberately, not
 * by omission. `canAccessRoute` denies anything absent from both this list
 * and `ROUTE_ROLES`, so a route added later without an entry in either is
 * blocked (and visibly so, since it redirects) rather than silently open.
 * `/no-access` must stay here: it's `DEFAULT_HOME_ROUTE` below, the landing
 * page for a role that matches nothing in `ROUTE_ROLES` — if it required a
 * role itself, that user would bounce off it straight back to itself.
 * `/profile` is here too: it's every signed-in user's own account page, not
 * a role-specific dashboard screen, so every role needs it open.
 */
const UNRESTRICTED_ROUTES = ['/no-access', '/profile'];

function isUnrestrictedRoute(pathname: string): boolean {
  return findMatchingRoute(pathname, UNRESTRICTED_ROUTES) !== undefined;
}

/**
 * Which roles may open each dashboard route (checked against the JWT's
 * unverified `roles` claim, like the rest of this file). A route absent from
 * both this map and `UNRESTRICTED_ROUTES` is denied to everyone — see
 * `canAccessRoute`. This is a UX-layer guard only: the backend re-checks
 * every real API call regardless (see `oan_grievance_service`), so this
 * cannot be the only place access is enforced.
 */
const ROUTE_ROLES: Record<string, Role[]> = {
  '/dashboard': [ROLES.OFFICER, ROLES.ADMIN],
  '/submit-grievance': [ROLES.SUBMITTER, ROLES.ASSISTED_SUBMITTER],
  '/all-grievances': [ROLES.SUBMITTER, ROLES.ASSISTED_SUBMITTER, ROLES.OFFICER, ROLES.ADMIN, ROLES.REVIEW_OFFICER],
  '/grievances': [ROLES.SUBMITTER, ROLES.ASSISTED_SUBMITTER, ROLES.OFFICER, ROLES.ADMIN, ROLES.REVIEW_OFFICER],
  '/analytics-reporting': [ROLES.OFFICER, ROLES.ADMIN],
  // Read-only per PR #47: officer list/stats and L1/L2 officers, and category
  // assignments — but NOT response templates or dashboard charts. That split
  // is finer than this route-level gate can express; the Administration and
  // User Management screens still need their own per-control hide/disable
  // pass (hide Add/Edit actions, hide the Response Templates tab) once the
  // role can be tested against a real backend session. Tracked as the
  // remaining STG-436 work — see this file's ROLES comment.
  '/user-management': [ROLES.ADMIN, ROLES.REVIEW_OFFICER],
  '/administration': [ROLES.ADMIN, ROLES.REVIEW_OFFICER],
  // Organisation onboarding (NGO / FPO). Both are plain Submitter screens: an
  // NGO or FPO representative signs up through the ordinary register flow and
  // holds the same role as a farmer. Which of the two a given user belongs to
  // is a submitter *type*, not a role, and the JWT this guard reads carries
  // only roles — so the NGO-vs-FPO split is enforced by the page itself (it
  // sends a user to their own kind's screen), not here.
  [ORGANISATION_ROUTE.ngo]: [ROLES.SUBMITTER],
  [ORGANISATION_ROUTE.fpo]: [ROLES.SUBMITTER],
};

/** Highest-privilege role first — decides which home route wins for a multi-role user. */
const ROLE_PRIORITY: Role[] = [
  ROLES.ADMIN,
  ROLES.OFFICER,
  ROLES.REVIEW_OFFICER,
  ROLES.SUBMITTER,
  ROLES.ASSISTED_SUBMITTER,
];

/** Where each role lands right after login, and where it's sent back to if it's bounced off a route it can't access. */
const ROLE_HOME_ROUTE: Record<Role, string> = {
  [ROLES.ADMIN]: '/dashboard',
  [ROLES.OFFICER]: '/all-grievances',
  [ROLES.REVIEW_OFFICER]: '/all-grievances',
  [ROLES.SUBMITTER]: '/submit-grievance',
  [ROLES.ASSISTED_SUBMITTER]: '/submit-grievance',
};

// Must be a route absent from ROUTE_ROLES — this is the fallback for a role
// string that matches none of the three known roles, and every real content
// route is now role-gated, so pointing this at one of them would send that
// user straight back into the same access check that sent them here,
// looping forever (proxy.ts has no other way out for an "authenticated but
// unrecognized" user — /login itself redirects an authenticated session away).
const DEFAULT_HOME_ROUTE = '/no-access';

function matchedRouteRoles(pathname: string): Role[] | null {
  const route = findMatchingRoute(pathname, Object.keys(ROUTE_ROLES));
  return route ? ROUTE_ROLES[route]! : null;
}

/**
 * A JWT with no roles at all is, right now, the *normal* case — this app's
 * own `/register` is the only self-serve path and (per the ROLES comment
 * above) it currently hands back `roles: []`, not a submitter role. Treating
 * that as "no access to anything" would lock every real self-registered user
 * out of Submit Grievance, so an empty list is treated as submitter-equivalent
 * here rather than as "no role". Remove this once the backend actually
 * assigns a role on registration.
 */
function effectiveRoles(roles: string[]): string[] {
  return roles.length > 0 ? roles : [ROLES.SUBMITTER];
}

/**
 * True if the route is explicitly unrestricted, or at least one of `roles`
 * is on its `ROUTE_ROLES` allow-list. Deny-by-default: a route in neither
 * place is blocked, not open — see `UNRESTRICTED_ROUTES`.
 */
export function canAccessRoute(pathname: string, roles: string[]): boolean {
  if (isUnrestrictedRoute(pathname)) return true;
  const allowed = matchedRouteRoles(pathname);
  if (!allowed) return false;
  return effectiveRoles(roles).some((role) => allowed.includes(role as Role));
}

/** The most-privileged role in `roles` (by `ROLE_PRIORITY`) picks the landing route; falls back to the dashboard. */
export function homeRouteForRoles(roles: string[]): string {
  const held = effectiveRoles(roles);
  const primary = ROLE_PRIORITY.find((role) => held.includes(role));
  return primary ? ROLE_HOME_ROUTE[primary] : DEFAULT_HOME_ROUTE;
}

/**
 * Where a user lands after signing in. Same as `homeRouteForRoles`, except an
 * NGO or FPO representative — someone whose highest role is Submitter and whose
 * submitter type is an organisation (see `organisationKindOf`) — lands on
 * their organisation's onboarding screen instead of Submit Grievance, until
 * the organisation is registered. Once it is (`organisationRegistered`), the
 * onboarding screen has nothing left to ask, so they land on Submit Grievance
 * like any other submitter; the status screen stays reachable from the sidebar.
 * Staff roles never take the organisation route, whatever their profile type says.
 *
 * `organisationKind` and `organisationRegistered` are parameters, not looked
 * up here, so this stays a pure function of its inputs and importable from
 * `proxy.ts`.
 */
export function homeRouteForUser(
  roles: string[],
  organisationKind: OrganisationKind | null,
  organisationRegistered = false
): string {
  const held = effectiveRoles(roles);
  const primary = ROLE_PRIORITY.find((role) => held.includes(role));
  if (primary === ROLES.SUBMITTER && organisationKind && !organisationRegistered) {
    return ORGANISATION_ROUTE[organisationKind];
  }
  return homeRouteForRoles(roles);
}

/**
 * True for a Grievance Officer or Grievance Admin — the two roles that manage
 * a case rather than just filing or following one. Used inside the grievance
 * detail view to gate case-management controls and internal-only content
 * (case assignment, SLA deferral, internal notes) that a submitter should
 * never see, same unverified-claim caveat as the rest of this file.
 *
 * Deliberately excludes `REVIEW_OFFICER`: per PR #47 (STG-434) that role can
 * read a case but is refused every assign/resolve/defer call, and internal
 * notes stay hidden from it same as a submitter — this function gating both
 * is what keeps that true on the frontend without a separate check.
 */
export function isOfficerOrAdmin(roles: string[]): boolean {
  return effectiveRoles(roles).some((role) => role === ROLES.OFFICER || role === ROLES.ADMIN);
}

/**
 * True for a Grievance Review Officer. Used to hide/disable the create, edit, and
 * password-reset controls on screens it can otherwise view (User Management,
 * Administration) — it can reach those routes (`ROUTE_ROLES` above) but PR #47
 * (STG-434) refuses it every write there, so a visible but always-403ing button
 * would just confuse it.
 */
export function isReviewOfficer(roles: string[]): boolean {
  return effectiveRoles(roles).some((role) => role === ROLES.REVIEW_OFFICER);
}

/**
 * True for anyone who sees every filed case rather than only their own — Officer, Admin,
 * or Review Officer. Deliberately a different question from `isOfficerOrAdmin`: that one
 * gates whether the viewer can *act* on a case, this one only decides whether the
 * all-grievances screen should call itself "All Grievances" or "My Grievances" and whether
 * its query should be scoped to the signed-in user. A Review Officer answers yes here (per
 * PR #47 it reads every filed case) and no to `isOfficerOrAdmin` (it can't act on one).
 */
export function canViewAllGrievances(roles: string[]): boolean {
  return isOfficerOrAdmin(roles) || isReviewOfficer(roles);
}
