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

export type OfficerLevel = 'L1' | 'L2';
export type OfficerBackendStatus = 'Active' | 'On Leave' | 'Inactive';

export interface OfficerAssignment {
  assignment: string;
  service_category: string | null;
  department: string | null;
  level: OfficerLevel;
  region: string | null;
  active: boolean;
  on_leave: boolean;
}

/** `GET /api/v1/officers` / `GET /api/v1/officers/<officer>` row. */
export interface OfficerRecord {
  name: string;
  full_name: string;
  designation: string | null;
  level: OfficerLevel;
  department: string;
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
   * nested under `data` on the wire). Worth reading after a create: it's the only place that
   * says whether `temporary_password` actually got applied, e.g. "... already had a login,
   * so their existing password is unchanged."
   */
  message?: string;
}

export interface ListOfficersParams {
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
  level?: OfficerLevel;
  department?: string;
  page?: number;
  page_size?: number;
}

export interface CreateOfficerPayload {
  full_name: string;
  designation: string;
  level: OfficerLevel;
  department: string;
  email: string;
  service_categories: string[];
  /**
   * Required. At least 8 characters with a letter and a number (weaker than a self-chosen
   * password — see `validateTemporaryPassword`). Applied only when `email` is a brand-new
   * login; an email that already has one keeps its existing password, reported back in the
   * create response's `message`, not in the returned officer record.
   */
  temporary_password: string;
  phone?: string | null;
  region?: string | null;
  status?: OfficerBackendStatus;
  reports_to?: string | null;
}

/** `POST /api/v1/officers/:officer/password-resets` body. */
export interface ResetTemporaryPasswordPayload {
  temporary_password: string;
}

/** Partial update. Only the fields present are sent — the backend treats omitted fields as unchanged. */
export interface UpdateOfficerPayload {
  level?: OfficerLevel;
  full_name?: string;
  designation?: string;
  department?: string;
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
