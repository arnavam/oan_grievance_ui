import { fetchApi } from '@/lib/api';
import type {
  GlobalSlaPolicyData,
  UpdateGlobalSlaPolicyPayload,
} from '../components/slaSettingsTypes';

interface RequestOptions {
  signal?: AbortSignal;
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
