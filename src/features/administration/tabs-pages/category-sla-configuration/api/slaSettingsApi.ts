import { fetchApi } from '@/lib/api';
import type {
  GlobalSlaPolicyData,
  ListSlaConfigurationsParams,
  SlaConfigurationData,
  SlaConfigurationListData,
  UpdateGlobalSlaPolicyPayload,
  UpdateSlaConfigurationPayload,
} from '../components/slaSettingsTypes';

interface RequestOptions {
  signal?: AbortSignal;
}

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
 * The installation-wide SLA policy.
 *
 * Corresponding REST endpoint: GET /api/v1/sla-policy
 */
export function fetchGlobalSlaPolicy(options: RequestOptions = {}): Promise<GlobalSlaPolicyData> {
  return fetchApi<GlobalSlaPolicyData>('/api/v1/sla-policy', { method: 'GET', signal: options.signal });
}

/**
 * Partial update. A new threshold applies to cases whose escalation is armed
 * afterwards; a new deferral setting applies to the next deferral request.
 *
 * Corresponding REST endpoint: PATCH /api/v1/sla-policy
 */
export function updateGlobalSlaPolicy(payload: UpdateGlobalSlaPolicyPayload): Promise<GlobalSlaPolicyData> {
  return fetchApi<GlobalSlaPolicyData>('/api/v1/sla-policy', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/**
 * Each category's SLA window, with the departments serving it.
 *
 * Corresponding REST endpoint: GET /api/v1/sla-configurations
 */
export function fetchSlaConfigurations(
  params: ListSlaConfigurationsParams = {},
  options: RequestOptions = {}
): Promise<SlaConfigurationListData> {
  return fetchApi<SlaConfigurationListData>(`/api/v1/sla-configurations${query(params)}`, {
    method: 'GET',
    signal: options.signal,
  });
}

/**
 * Partial update of one category's SLA window. The values are shared with
 * every department serving the category and with its category assignments.
 *
 * Corresponding REST endpoint: PATCH /api/v1/sla-configurations/:config
 */
export function updateSlaConfiguration(
  config: string,
  payload: UpdateSlaConfigurationPayload
): Promise<SlaConfigurationData> {
  return fetchApi<SlaConfigurationData>(`/api/v1/sla-configurations/${encodeURIComponent(config)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
