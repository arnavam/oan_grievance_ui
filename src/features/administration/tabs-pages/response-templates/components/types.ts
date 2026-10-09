import type { ResponseParts } from '@/lib/responseBody';

/**
 * Response templates as administrators manage them — mirrors
 * `AdminResponseTemplate` and its request bodies in
 * oan_grievance_service/openapi/openapi_v1.public.yaml.
 */

export interface ResponseTemplate {
  /** Template code; the identifier, fixed once created. */
  template: string;
  title: string;
  action: string;
  /** Null for every department. */
  department?: string | null;
  /** Null for every category. */
  service_category?: string | null;
  /** Jinja template for the action's reason, unrendered. */
  body: string;
  /**
   * `body` split into Action taken + Resolution summary, as it is authored and
   * shown; null for a template not written in two parts.
   */
  reason_parts?: ResponseParts | null;
  /** Actions sent with this template. */
  usage_count: number;
  is_active: boolean;
}

export interface Pagination {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ResponseTemplateListData {
  response_templates: ResponseTemplate[];
  pagination: Pagination;
}

export interface ResponseTemplateData {
  response_template: ResponseTemplate;
}

export interface ResponseTemplateListParams {
  page?: number;
  page_size?: number;
  action?: string;
  department?: string;
  service_category?: string;
  is_active?: boolean;
}

/** `CreateResponseTemplateRequest`. An omitted department or category means "every". */
export interface CreateResponseTemplatePayload {
  title: string;
  action: string;
  department?: string | null;
  service_category?: string | null;
  /** The body's two parts; the service stores them together as the body. */
  action_taken?: string;
  resolution_summary?: string;
  body?: string;
  is_active?: boolean;
}

/** `UpdateResponseTemplateRequest`: partial; the code can't change, and null clears a scope. */
export type UpdateResponseTemplatePayload = Partial<Omit<CreateResponseTemplatePayload, 'template'>>;

/** The variables `render_context` in the service makes available to a template body. */
export const TEMPLATE_VARIABLES = [
  'ticket_number',
  'service_category',
  'grievance_type',
  'department',
  'submitter_name',
  'officer_name',
  'today',
  'sla_due_date',
] as const;
