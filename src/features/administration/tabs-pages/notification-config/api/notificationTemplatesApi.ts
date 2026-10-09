import { fetchApi } from '@/lib/api';
import type {
  NotificationTemplateData,
  NotificationTemplateListData,
  NotificationTemplateListParams,
  PlaceholdersResponseData,
  UpdateNotificationTemplatePayload,
} from '../components/types';

interface RequestOptions {
  signal?: AbortSignal;
}

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
 * Fetch list of grievance notification templates.
 * Returns both active and inactive rules by default.
 *
 * REST endpoint: GET /api/v1/notification-templates
 */
export function fetchNotificationTemplates(
  params: NotificationTemplateListParams = {},
  options: RequestOptions = {}
): Promise<NotificationTemplateListData> {
  return fetchApi<NotificationTemplateListData>(`/api/v1/notification-templates${query(params)}`, {
    method: 'GET',
    signal: options.signal,
  });
}

/**
 * Fetch a single notification template by document name / ID.
 *
 * REST endpoint: GET /api/v1/notification-templates/:template
 */
export function getNotificationTemplate(
  template: string,
  options: RequestOptions = {}
): Promise<NotificationTemplateData> {
  return fetchApi<NotificationTemplateData>(`/api/v1/notification-templates/${encodeURIComponent(template)}`, {
    method: 'GET',
    signal: options.signal,
  });
}

/**
 * Partial update for a notification template (enabled, subject, body, recipient_type, role_level).
 *
 * REST endpoint: PATCH /api/v1/notification-templates/:template
 */
export function updateNotificationTemplate(
  template: string,
  payload: UpdateNotificationTemplatePayload
): Promise<NotificationTemplateData> {
  return fetchApi<NotificationTemplateData>(`/api/v1/notification-templates/${encodeURIComponent(template)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/**
 * Fetch curated list of allowed placeholders for notification templates.
 *
 * REST endpoint: GET /api/v1/notification-templates/placeholders
 */
export function fetchNotificationPlaceholders(
  options: RequestOptions = {}
): Promise<PlaceholdersResponseData> {
  return fetchApi<PlaceholdersResponseData>('/api/v1/notification-templates/placeholders', {
    method: 'GET',
    signal: options.signal,
  });
}

/**
 * Fetch notification template options (channels, flat recipients, role levels, and placeholders).
 *
 * REST endpoint: GET /api/v1/notification-templates/options
 */
export function fetchNotificationTemplateOptions(
  options: RequestOptions = {}
): Promise<import('../components/types').NotificationTemplateOptionsData> {
  return fetchApi<import('../components/types').NotificationTemplateOptionsData>(
    '/api/v1/notification-templates/options',
    {
      method: 'GET',
      signal: options.signal,
    }
  );
}


