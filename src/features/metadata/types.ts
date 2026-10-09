/**
 * TypeScript definitions for OAN Grievance Service Metadata & Reference REST APIs.
 * Derived from `oan_grievance_rest_collection.json` and `oan_grievance_service` v1 APIs.
 */

export interface SubmitterTypeOption {
  type_name: string;
  code: string;
  description: string;
}

export interface SubmissionTypeOption {
  type_name: string;
  code: string;
  description: string;
}

export interface PreferredLanguageOption {
  code: string;
  label: string;
}

export interface ServiceCategoryOption {
  category_name: string;
  code: string;
  sort_order: number;
}

export interface GrievanceTypeOption {
  grievance_type_id: string;
  type_name: string;
  service_category: string;
}

export interface PhoneExtensionOption {
  country: string;
  code: string;
  isd: string;
}

/** Payload returned by GET /api/v1/submitters/options */
export interface SubmitterOptionsData {
  submitter_types: SubmitterTypeOption[];
  submission_types: SubmissionTypeOption[];
  preferred_languages: PreferredLanguageOption[];
  service_categories: ServiceCategoryOption[];
  grievance_types: GrievanceTypeOption[];
  phone_extensions?: PhoneExtensionOption[];
}

export interface SubmitterOptionsQueryParams {
  search_country?: string;
  country?: string;
  include_phone_extensions?: boolean | string;
  service_category?: string;
}

/** Administrative Area node in the Ethiopian administrative hierarchy */
export interface AdministrativeArea {
  area_id: string;
  area_name: string;
  code: string;
  path_code: string;
  level_name: 'Country' | 'Region' | 'Zone' | 'Woreda' | 'Kebele' | string;
  parent_administrative_area?: string | null;
  is_group: number;
  depth: number;
}

/** Payload returned by GET /api/v1/administrative-areas */
export interface AdministrativeAreasData {
  areas: AdministrativeArea[];
  count: number;
  parent?: string | string[] | null;
  level_name?: string | null;
}

export interface AdministrativeAreasQueryParams {
  parent?: string | string[];
  level_name?: 'Region' | 'Zone' | 'Woreda' | 'Kebele' | string;
  search?: string;
  ancestors_of?: string;
  limit?: number;
}

export interface AdministrativeAreaNode {
  area_id: string;
  area_name: string;
  code?: string;
  path_code?: string;
  level_name: string;
  depth?: number;
}

/** Payload returned by GET /api/v1/administrative-areas/:area_id_or_path/ancestors */
export interface AdministrativeAreaAncestorsData {
  current: {
    area_id: string;
    area_name: string;
    path_code: string;
    level_name: string;
  } | null;
  breadcrumbs: AdministrativeAreaNode[];
}

export interface GrievanceDepartmentOption {
  department_id: string;
  department_name: string;
  email_account?: string;
  head_of_dept?: string;
}

export interface GrievanceOfficerOption {
  user_id: string;
  full_name: string;
  role_level: string;
  is_primary: boolean;
}

export interface GrievanceStatusOption {
  status: string;
  label: string;
  is_open: 0 | 1;
  is_terminal: 0 | 1;
}

/** Payload returned by GET /api/v1/grievances/options (Protected: staff & officers) */
export interface GrievanceOptionsData {
  departments: GrievanceDepartmentOption[];
  statuses: GrievanceStatusOption[];
  service_categories: ServiceCategoryOption[];
  grievance_types: GrievanceTypeOption[];
  submission_channels: string[];
  officers?: GrievanceOfficerOption[];
}

export interface GrievanceOptionsQueryParams {
  service_category?: string;
  department?: string;
}

/** Standard envelope returned by Frappe / OAN REST endpoints */
export interface ApiResponseEnvelope<T> {
  status?: string;
  message?: string | { data?: T; status?: string; message?: string };
  data?: T;
  meta?: Record<string, unknown>;
  pagination?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}
