import { fetchApi } from '@/lib/api';
import type {
  CreateResponseTemplatePayload,
  ResponseTemplateData,
  ResponseTemplateListData,
  ResponseTemplateListParams,
  UpdateResponseTemplatePayload,
} from '../components/types';

interface RequestOptions {
  signal?: AbortSignal;
}

/** The service's largest page; the admin list reads one page of it. */
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

/**
 * Admin list of response templates with their usage counts.
 *
 * Corresponding REST endpoint: GET /api/v1/response-templates
 */
export function fetchResponseTemplates(
  params: ResponseTemplateListParams = {},
  options: RequestOptions = {}
): Promise<ResponseTemplateListData> {
  return fetchApi<ResponseTemplateListData>(`/api/v1/response-templates${query(params)}`, {
    method: 'GET',
    signal: options.signal,
  });
}

/**
 * Corresponding REST endpoint: POST /api/v1/response-templates
 */
export function createResponseTemplate(payload: CreateResponseTemplatePayload): Promise<ResponseTemplateData> {
  return fetchApi<ResponseTemplateData>('/api/v1/response-templates', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Partial update; edits are tracked by the service.
 *
 * Corresponding REST endpoint: PATCH /api/v1/response-templates/:template
 */
export function updateResponseTemplate(
  template: string,
  payload: UpdateResponseTemplatePayload
): Promise<ResponseTemplateData> {
  return fetchApi<ResponseTemplateData>(`/api/v1/response-templates/${encodeURIComponent(template)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/**
 * Retires a template — the service keeps it (its usage history stays), the
 * same as PATCH with `is_active: false`. Repeating it is a no-op.
 *
 * Corresponding REST endpoint: DELETE /api/v1/response-templates/:template
 */
export function retireResponseTemplate(template: string): Promise<ResponseTemplateData> {
  return fetchApi<ResponseTemplateData>(`/api/v1/response-templates/${encodeURIComponent(template)}`, {
    method: 'DELETE',
  });
}

/**
 * Corresponding REST endpoint: GET /api/v1/response-types
 */

