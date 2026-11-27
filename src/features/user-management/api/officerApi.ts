import { fetchApi } from '@/lib/api';
import type {
  CategoryAssignmentListData,
  CreateOfficerPayload,
  ListCategoryAssignmentsParams,
  ListOfficersParams,
  ListOfficerStatisticsParams,
  ListOfficerStatusCountsParams,
  OfficerCandidateData,
  OfficerData,
  OfficerListData,
  OfficerStatisticsListData,
  OfficerStatusCounts,
  ResetTemporaryPasswordPayload,
  UpdateOfficerPayload,
} from '../types';

export interface RequestOptions {
  signal?: AbortSignal;
}

function buildQuery(params: object): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    searchParams.set(key, String(value));
  }
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Admin list of L1/L2 officers, filterable by level, department, status, service
 * category and region; `q` matches name or email.
 *
 * Corresponding REST endpoint: GET /api/v1/officers
 */
export async function fetchOfficers(
  params: ListOfficersParams = {},
  options: RequestOptions = {}
): Promise<OfficerListData> {
  return fetchApi<OfficerListData>(`/api/v1/officers${buildQuery(params)}`, {
    method: 'GET',
    signal: options.signal,
  });
}

/**
 * One L1 or L2 officer with the category desks (RBAC assignments) they sit on.
 *
 * Corresponding REST endpoint: GET /api/v1/officers/:officer
 */
export async function fetchOfficer(officerId: string, options: RequestOptions = {}): Promise<OfficerData> {
  return fetchApi<OfficerData>(`/api/v1/officers/${encodeURIComponent(officerId)}`, {
    method: 'GET',
    signal: options.signal,
  });
}

/**
 * Logins that hold the officer role (`role: 'Reviewer'` for the review role) but are on no
 * desk yet, so an admin can place one instead of typing an email. `q` matches name or email.
 *
 * Corresponding REST endpoint: GET /api/v1/officers/candidates
 */
export async function fetchOfficerCandidates(
  params: { role?: 'Officer' | 'Reviewer'; q?: string } = {},
  options: RequestOptions = {}
): Promise<OfficerCandidateData> {
  return fetchApi<OfficerCandidateData>(`/api/v1/officers/candidates${buildQuery(params)}`, {
    method: 'GET',
    signal: options.signal,
  });
}

/**
 * Makes a login an L1 or L2 officer on the category desks of a department. The
 * login is created when the email is new.
 *
 * Corresponding REST endpoint: POST /api/v1/officers
 */
export async function createOfficer(
  payload: CreateOfficerPayload,
  options: RequestOptions = {}
): Promise<OfficerData> {
  return fetchApi<OfficerData>('/api/v1/officers', {
    method: 'POST',
    body: JSON.stringify(payload),
    signal: options.signal,
  });
}

/**
 * Active/On Leave/Inactive totals (plus the overall total) for one tab, using the same
 * filters as its list but without `status` — one call instead of the three separate
 * `page_size: 1` probes a per-status count would otherwise need. Registered before
 * `/<officer>` server-side so this path is never swallowed by that dynamic route.
 *
 * Corresponding REST endpoint: GET /api/v1/officers/status-counts
 */
export async function fetchOfficerStatusCounts(
  params: ListOfficerStatusCountsParams = {},
  options: RequestOptions = {}
): Promise<OfficerStatusCounts> {
  return fetchApi<OfficerStatusCounts>(`/api/v1/officers/status-counts${buildQuery(params)}`, {
    method: 'GET',
    signal: options.signal,
  });
}

/**
 * Partial update of an officer's profile, level, desks, or status. Set
 * `status: "Inactive"` to deactivate — officers are never deleted.
 *
 * Corresponding REST endpoint: PATCH /api/v1/officers/:officer
 */
export async function updateOfficer(
  officerId: string,
  payload: UpdateOfficerPayload,
  options: RequestOptions = {}
): Promise<OfficerData> {
  return fetchApi<OfficerData>(`/api/v1/officers/${encodeURIComponent(officerId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    signal: options.signal,
  });
}

/**
 * Issues a new temporary password for an officer who can't sign in (forgot the original,
 * or never used it). Ends their current sessions; refused (403) for an account that itself
 * holds an admin role. Rate-limited to 10 requests per admin every 5 minutes.
 *
 * Corresponding REST endpoint: POST /api/v1/officers/:officer/password-resets
 */
export async function resetTemporaryPassword(
  officerId: string,
  payload: ResetTemporaryPasswordPayload,
  options: RequestOptions = {}
): Promise<OfficerData> {
  return fetchApi<OfficerData>(`/api/v1/officers/${encodeURIComponent(officerId)}/password-resets`, {
    method: 'POST',
    body: JSON.stringify(payload),
    signal: options.signal,
  });
}

/**
 * Per-officer grievances assigned, resolved, average resolution time (hours), and
 * resolution rate (percent), for L1/L2 officers staffing an active RBAC desk.
 * Computed live on every call — never stored, so this is fetched separately from
 * the officer profile list above.
 *
 * Corresponding REST endpoint: GET /api/v1/officers/statistics
 */
export async function fetchOfficerStatistics(
  params: ListOfficerStatisticsParams = {},
  options: RequestOptions = {}
): Promise<OfficerStatisticsListData> {
  return fetchApi<OfficerStatisticsListData>(`/api/v1/officers/statistics${buildQuery(params)}`, {
    method: 'GET',
    signal: options.signal,
  });
}

/**
 * Which service categories already have an active routing desk for a department — see
 * `CategoryAssignmentRecord`'s own doc comment for why the Add/Edit officer forms need this.
 *
 * Corresponding REST endpoint: GET /api/v1/category-assignments
 */
export async function fetchCategoryAssignments(
  params: ListCategoryAssignmentsParams = {},
  options: RequestOptions = {}
): Promise<CategoryAssignmentListData> {
  return fetchApi<CategoryAssignmentListData>(`/api/v1/category-assignments${buildQuery(params)}`, {
    method: 'GET',
    signal: options.signal,
  });
}

/**
 * Names of the active service categories, in display order. `hasDesk: true` keeps only those
 * with an active desk (what an officer or reviewer can be placed on); omit it for every
 * category, which is what a category admin may be assigned.
 *
 * Corresponding REST endpoint: GET /api/v1/service-categories
 */
export async function fetchServiceCategoryNames(
  params: { hasDesk?: boolean } = {},
  options: RequestOptions = {}
): Promise<string[]> {
  const data = await fetchApi<{ service_categories: { category_name: string }[] }>(
    `/api/v1/service-categories${buildQuery({ is_active: true, has_desk: params.hasDesk, page_size: 100 })}`,
    { method: 'GET', signal: options.signal }
  );
  return (data?.service_categories ?? []).map((category) => category.category_name);
}

/** Service object matching the OAN A2C enterprise standard */
export const officerService = {
  listOfficers: fetchOfficers,
  getOfficer: fetchOfficer,
  createOfficer,
  updateOfficer,
  resetTemporaryPassword,
  getStatistics: fetchOfficerStatistics,
  getStatusCounts: fetchOfficerStatusCounts,
  listCategoryAssignments: fetchCategoryAssignments,
};

/**
 * Names of the active grievance types under one service category, in display order.
 *
 * Corresponding REST endpoint: GET /api/v1/grievance-types
 */
export async function fetchGrievanceTypeNames(category: string, options: RequestOptions = {}): Promise<string[]> {
  const data = await fetchApi<{ grievance_types: { type_name: string }[] }>(
    `/api/v1/grievance-types${buildQuery({ service_category: category, is_active: true, page_size: 100 })}`,
    { method: 'GET', signal: options.signal }
  );
  return (data?.grievance_types ?? []).map((type) => type.type_name);
}
