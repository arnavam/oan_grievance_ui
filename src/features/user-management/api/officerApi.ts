import { fetchApi } from '@/lib/api';
import type {
  CategoryAssignmentListData,
  CreateOfficerPayload,
  ListCategoryAssignmentsParams,
  ListOfficersParams,
  ListOfficerStatisticsParams,
  OfficerData,
  OfficerListData,
  OfficerStatisticsListData,
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

/** Service object matching the OAN A2C enterprise standard */
export const officerService = {
  listOfficers: fetchOfficers,
  getOfficer: fetchOfficer,
  createOfficer,
  updateOfficer,
  resetTemporaryPassword,
  getStatistics: fetchOfficerStatistics,
  listCategoryAssignments: fetchCategoryAssignments,
};
