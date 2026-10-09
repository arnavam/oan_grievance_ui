import { fetchApi } from '@/lib/api';
import type {
  AdministrativeAreaAncestorsData,
  AdministrativeAreasData,
  AdministrativeAreasQueryParams,
  GrievanceOptionsData,
  GrievanceOptionsQueryParams,
  SubmitterOptionsData,
  SubmitterOptionsQueryParams,
} from '../types';

export interface RequestOptions {
  signal?: AbortSignal;
}

/**
 * Builds URLSearchParams from an object, skipping undefined and null values.
 */
function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        const filtered = value.filter((v) => v !== undefined && v !== null && v !== '');
        if (filtered.length > 0) {
          searchParams.set(key, filtered.join(','));
        }
      } else {
        searchParams.set(key, String(value));
      }
    }
  }
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Public reference endpoint reachable without authentication.
 * Retrieves dropdown data for submitters, intake forms, and public wizards, including
 * active submitter types, intake channels, supported languages, ISD phone extensions,
 * service categories, and grievance types.
 *
 * Corresponding REST endpoint: GET /api/v1/submitters/options
 */
export async function fetchSubmitterOptions(
  params: SubmitterOptionsQueryParams = {},
  options: RequestOptions = {}
): Promise<SubmitterOptionsData> {
  const query = buildQueryString({
    search_country: params.search_country,
    country: params.country,
    include_phone_extensions: params.include_phone_extensions,
    service_category: params.service_category,
  });

  return fetchApi<SubmitterOptionsData>(`/api/v1/submitters/options${query}`, {
    method: 'GET',
    signal: options.signal,
  });
}

/**
 * Public cascading location endpoint.
 * Returns top-level Regions when called without parameters, or child areas (Zones, Woredas, Kebeles)
 * when `parent` is provided. Also supports text search and level filtering.
 *
 * Corresponding REST endpoint: GET /api/v1/administrative-areas
 */
export async function fetchAdministrativeAreas(
  params: AdministrativeAreasQueryParams = {},
  options: RequestOptions = {}
): Promise<AdministrativeAreasData> {
  const query = buildQueryString({
    parent: params.parent,
    level_name: params.level_name,
    search: params.search,
    ancestors_of: params.ancestors_of,
    limit: params.limit,
  });

  return fetchApi<AdministrativeAreasData>(`/api/v1/administrative-areas${query}`, {
    method: 'GET',
    signal: options.signal,
  });
}

/**
 * Public endpoint to retrieve ancestor breadcrumbs for a selected administrative area node.
 *
 * Corresponding REST endpoint: GET /api/v1/administrative-areas/:area_id_or_path/ancestors
 */
export async function fetchAdministrativeAreaAncestors(
  areaIdOrPath: string,
  options: RequestOptions = {}
): Promise<AdministrativeAreaAncestorsData> {
  if (!areaIdOrPath) {
    throw new Error('areaIdOrPath is required');
  }

  const encodedPath = encodeURIComponent(areaIdOrPath);
  return fetchApi<AdministrativeAreaAncestorsData>(
    `/api/v1/administrative-areas/${encodedPath}/ancestors`,
    {
      method: 'GET',
      signal: options.signal,
    }
  );
}

/**
 * Protected management reference endpoint for Grievance Officers and Administrators.
 * Retrieves reference data for case triage, assignment, and status filters, including
 * departments, lifecycle statuses with open/terminal flags, categories, types, and channels.
 *
 * Corresponding REST endpoint: GET /api/v1/grievances/options
 */
export async function fetchGrievanceOptions(
  params: GrievanceOptionsQueryParams = {},
  options: RequestOptions = {}
): Promise<GrievanceOptionsData> {
  const query = buildQueryString({
    service_category: params.service_category,
    department: params.department,
  });

  return fetchApi<GrievanceOptionsData>(`/api/v1/grievances/options${query}`, {
    method: 'GET',
    signal: options.signal,
  });
}

/** Service object matching the OAN A2C enterprise standard */
export const metadataService = {
  getSubmitterOptions: fetchSubmitterOptions,
  getAdministrativeAreas: fetchAdministrativeAreas,
  getAdministrativeAreaAncestors: fetchAdministrativeAreaAncestors,
  getGrievanceOptions: fetchGrievanceOptions,
};
