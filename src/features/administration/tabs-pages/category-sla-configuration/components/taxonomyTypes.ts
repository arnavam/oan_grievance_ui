/**
 * Service categories and grievance types as administrators manage them —
 * mirrors docs/taxonomy-api.md in oan_grievance_service (PR #48).
 */

export interface ServiceCategoryRecord {
  category_name: string;
  /** 3-character ticket code. */
  code: string;
  sort_order: number;
  is_active: boolean;
  /** The category unclassified cases are filed under; exactly one. */
  is_default: boolean;
  /** Active types. */
  grievance_type_count: number;
  assignment_count: number;
  response_template_count: number;
  has_grievances: boolean;
  /** True once tickets exist: the code can no longer change. */
  code_locked: boolean;
  /** Set while a queued rename is running; the record still shows the old name. */
  renaming_to: string | null;
}

export interface GrievanceTypeRecord {
  grievance_type_id: string;
  type_name: string;
  service_category: string;
  is_active: boolean;
  has_grievances: boolean;
}

export interface Pagination {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ServiceCategoryListData {
  service_categories: ServiceCategoryRecord[];
  pagination: Pagination;
}

export interface ServiceCategoryData {
  service_category: ServiceCategoryRecord;
}

export interface GrievanceTypeListData {
  grievance_types: GrievanceTypeRecord[];
  pagination: Pagination;
}

export interface GrievanceTypeData {
  grievance_type: GrievanceTypeRecord;
}

export interface ServiceCategoryListParams {
  is_active?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface GrievanceTypeListParams extends ServiceCategoryListParams {
  service_category?: string;
}

export interface CreateServiceCategoryPayload {
  category_name: string;
  code: string;
  sort_order?: number;
  is_active?: boolean;
  is_default?: boolean;
}

/** Partial; `is_default: false` is refused by the service — promote another category instead. */
export type UpdateServiceCategoryPayload = Partial<{
  category_name: string;
  code: string;
  sort_order: number;
  is_active: boolean;
  is_default: true;
}>;

export interface CreateGrievanceTypePayload {
  service_category: string;
  type_name: string;
  is_active?: boolean;
}

/** A type can't move to another category, so `service_category` isn't accepted. */
export type UpdateGrievanceTypePayload = Partial<{
  type_name: string;
  is_active: boolean;
}>;

/** Ticket codes: 3 characters from 0-9 A-Z without I, L, O, U (service-side rule). */
export const TICKET_CODE_PATTERN = /^[0-9A-HJKMNP-TV-Z]{3}$/;
