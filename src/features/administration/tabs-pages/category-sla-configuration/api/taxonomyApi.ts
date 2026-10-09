import { fetchApi } from '@/lib/api';
import type {
  CreateGrievanceTypePayload,
  CreateServiceCategoryPayload,
  GrievanceTypeData,
  GrievanceTypeListData,
  GrievanceTypeListParams,
  ServiceCategoryData,
  ServiceCategoryListData,
  ServiceCategoryListParams,
  UpdateGrievanceTypePayload,
  UpdateServiceCategoryPayload,
} from '../components/taxonomyTypes';

interface RequestOptions {
  signal?: AbortSignal;
}

/** The service's largest page; the admin lists read one page of it. */
export const MAX_PAGE_SIZE = 100;

function query(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

/** Corresponding REST endpoint: GET /api/v1/service-categories */
export function fetchServiceCategories(
  params: ServiceCategoryListParams = {},
  options: RequestOptions = {}
): Promise<ServiceCategoryListData> {
  return fetchApi<ServiceCategoryListData>(`/api/v1/service-categories${query(params)}`, {
    method: 'GET',
    signal: options.signal,
  });
}

/** Corresponding REST endpoint: POST /api/v1/service-categories */
export function createServiceCategory(payload: CreateServiceCategoryPayload): Promise<ServiceCategoryData> {
  return fetchApi<ServiceCategoryData>('/api/v1/service-categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Partial update. A rename runs in the background: the response still carries
 * the old name, with `renaming_to` set until the job finishes.
 *
 * Corresponding REST endpoint: PATCH /api/v1/service-categories/:category
 */
export function updateServiceCategory(
  category: string,
  payload: UpdateServiceCategoryPayload
): Promise<ServiceCategoryData> {
  return fetchApi<ServiceCategoryData>(`/api/v1/service-categories/${encodeURIComponent(category)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/**
 * Deactivates the category and all its types; nothing is deleted. Same as
 * PATCH with `is_active: false`.
 *
 * Corresponding REST endpoint: DELETE /api/v1/service-categories/:category
 */
export function deactivateServiceCategory(category: string): Promise<ServiceCategoryData> {
  return fetchApi<ServiceCategoryData>(`/api/v1/service-categories/${encodeURIComponent(category)}`, {
    method: 'DELETE',
  });
}

/** Corresponding REST endpoint: GET /api/v1/grievance-types */
export function fetchGrievanceTypes(
  params: GrievanceTypeListParams = {},
  options: RequestOptions = {}
): Promise<GrievanceTypeListData> {
  return fetchApi<GrievanceTypeListData>(`/api/v1/grievance-types${query(params)}`, {
    method: 'GET',
    signal: options.signal,
  });
}

/** Corresponding REST endpoint: POST /api/v1/grievance-types */
export function createGrievanceType(payload: CreateGrievanceTypePayload): Promise<GrievanceTypeData> {
  return fetchApi<GrievanceTypeData>('/api/v1/grievance-types', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Corresponding REST endpoint: PATCH /api/v1/grievance-types/:grievance_type */
export function updateGrievanceType(
  grievanceType: string,
  payload: UpdateGrievanceTypePayload
): Promise<GrievanceTypeData> {
  return fetchApi<GrievanceTypeData>(`/api/v1/grievance-types/${encodeURIComponent(grievanceType)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/** Corresponding REST endpoint: DELETE /api/v1/grievance-types/:grievance_type */
export function deactivateGrievanceType(grievanceType: string): Promise<GrievanceTypeData> {
  return fetchApi<GrievanceTypeData>(`/api/v1/grievance-types/${encodeURIComponent(grievanceType)}`, {
    method: 'DELETE',
  });
}
