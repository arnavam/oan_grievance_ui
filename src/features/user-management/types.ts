/**
 * Types for the officer management and statistics APIs.
 *
 * Mirrors `oan_grievance_service/api/v1/officer.py` and `officer_statistics.py`
 * (merged into `develop`), plus `oan_auth_service`'s temporary-password endpoints
 * — see `docs/officer-management-api.md` in `oan_grievance_service` for the full
 * frontend integration guide. An officer is a User placed on category desks via
 * Grievance RBAC Assignment Officer rows; there is no separate "officer" doctype.
 * `name` is the user id (the officer's email).
 */

/** L3 is a department head: the department's final escalation rung, shown on the Admin tab. */
export type OfficerLevel = 'L1' | 'L2' | 'L3';
export type OfficerBackendStatus = 'Active' | 'On Leave' | 'Inactive';
/**
 * `Officer` covers L1/L2/L3 (level distinguishes them); `Reviewer` is a separate, desk-scoped
 * read-only account with no level of its own — see `oan_grievance_service/api/v1/officer.py`'s
 * own module doc comment (STG-443). There is no literal "Admin" role on the wire: the
 * Administration tab's "Admin" tab is `role: 'Officer', level: 'L3'`, not a distinct role.
 */
export type OfficerRole = 'Officer' | 'Reviewer';

export interface OfficerAssignment {
  assignment: string;
  service_category: string | null;
  department: string | null;
  level: OfficerLevel | null;
  region: string | null;
  active: boolean;
  on_leave: boolean;
}

/** `GET /api/v1/officers` / `GET /api/v1/officers/<officer>` row. */
export interface OfficerRecord {
  name: string;
  full_name: string;
  role: OfficerRole;
  designation: string | null;
  /** Null for a Reviewer — only an Officer (L1/L2/L3) has a level. */
  level: OfficerLevel | null;
  /** Null only in principle (the backend requires it on create for both roles today). */
  department: string | null;
  email: string;
  phone: string | null;
  /** True while the officer still holds an admin-issued temporary password and hasn't replaced it yet. */
  must_change_password: boolean;
  region: string | null;
  region_name: string | null;
  status: OfficerBackendStatus;
  service_categories: string[];
  reports_to: string | null;
  reports_to_name: string | null;
  assignments: OfficerAssignment[];
}

/** `GET /api/v1/officers/statistics` row. Computed live from Grievance data, never stored. */
export interface OfficerStatisticsRecord {
  user: string;
  full_name: string | null;
  level: OfficerLevel;
  role_level: string;
  assigned: number;
  resolved: number;
  avg_resolution_hours: number | null;
  resolution_rate: number;
}

export interface OfficerListPagination {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

/** A login that holds the officer role but sits on no desk yet — who `POST /officers` can place. */
export interface OfficerCandidate {
  name: string;
  full_name: string;
  email: string;
  phone?: string | null;
  /** Signs in through an identity provider, which owns their roles. */
  delegated: boolean;
}

export interface OfficerCandidateData {
  candidates: OfficerCandidate[];
}

export interface OfficerListData {
  officers: OfficerRecord[];
  pagination: OfficerListPagination;
}

export interface OfficerStatisticsListData {
  officers: OfficerStatisticsRecord[];
  pagination: OfficerListPagination;
}

export interface OfficerData {
  officer: OfficerRecord;
  /**
   * The envelope's success message, merged in by `fetchApi` (see its own comment — it isn't
   * nested under `data` on the wire).
   */
  message?: string;
}

export interface ListOfficersParams {
  /** Defaults to `'Officer'` server-side. Omit `level` entirely when this is `'Reviewer'` — a Reviewer has no level, and sending one is refused (400). */
  role?: OfficerRole;
  level?: OfficerLevel;
  department?: string;
  status?: OfficerBackendStatus;
  service_category?: string;
  region?: string;
  q?: string;
  page?: number;
  page_size?: number;
}

export interface ListOfficerStatisticsParams {
  /** Statistics only exist for L1/L2 — L3 (department heads) and Reviewers are refused (400). */
  level?: 'L1' | 'L2';
  department?: string;
  page?: number;
  page_size?: number;
}

/** `GET /api/v1/officers/status-counts` params — the list's own filters, without `status`. */
export interface ListOfficerStatusCountsParams {
  role?: OfficerRole;
  level?: OfficerLevel;
  department?: string;
  service_category?: string;
  region?: string;
  q?: string;
}

/** `GET /api/v1/officers/status-counts` response body — `data` itself, not nested under a key. */
export interface OfficerStatusCounts {
  active: number;
  on_leave: number;
  inactive: number;
  total: number;
}

export interface CreateOfficerPayload {
  /** Defaults to `'Officer'` server-side. */
  role?: OfficerRole;
  full_name: string;
  email: string;
  department?: string | null;
  service_categories: string[];
  /** Optional when `role` is `'Officer'`; rejected (400) for a Reviewer. */
  designation?: string | null;
  /** Required when `role` is `'Officer'`; rejected (400) for a Reviewer. */
  level?: OfficerLevel | null;
  phone?: string | null;
  region?: string | null;
  /** A Reviewer is Active or Inactive only — 'On Leave' is refused (400). */
  status?: OfficerBackendStatus;
  /** An L1's L2 supervisor. Rejected (400) for anything but role `'Officer'`, level `'L1'`. */
  reports_to?: string | null;
}

/** `POST /api/v1/officers/:officer/password-resets` body. */
export interface ResetTemporaryPasswordPayload {
  temporary_password: string;
}

/** Partial update. Only the fields present are sent — the backend treats omitted fields as unchanged. `email` and `role` are fixed once created. */
export interface UpdateOfficerPayload {
  level?: OfficerLevel;
  full_name?: string;
  designation?: string | null;
  department?: string | null;
  phone?: string | null;
  region?: string | null;
  status?: OfficerBackendStatus;
  service_categories?: string[];
  reports_to?: string | null;
}

/**
 * `GET /api/v1/category-assignments` row — a Grievance RBAC Assignment "desk" that routes
 * one service category to one department. Creating an officer on a category/department
 * combo with no active desk here is refused server-side ("no category assignment found"),
 * so the Add/Edit forms use this to only offer categories that are actually wired for the
 * chosen department, instead of surfacing that failure after the fact.
 */
export interface CategoryAssignmentRecord {
  name: string;
  service_category: string;
  department: string;
  active: boolean;
}

export interface CategoryAssignmentListData {
  assignments: CategoryAssignmentRecord[];
  pagination: OfficerListPagination;
}

export interface ListCategoryAssignmentsParams {
  department?: string;
  service_category?: string;
  active?: boolean;
  page?: number;
  page_size?: number;
}
