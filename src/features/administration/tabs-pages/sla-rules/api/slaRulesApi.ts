import { fetchApi } from '@/lib/api';
import type {
  CreateSlaRulePayload,
  SlaRuleData,
  SlaRuleListData,
  SlaRuleListParams,
  UpdateSlaRulePayload,
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
 * The SLA rules, by service category and then oldest first.
 *
 * Corresponding REST endpoint: GET /api/v1/sla-rules
 */
export function fetchSlaRules(params: SlaRuleListParams = {}, options: RequestOptions = {}): Promise<SlaRuleListData> {
  return fetchApi<SlaRuleListData>(`/api/v1/sla-rules${query(params)}`, {
    method: 'GET',
    signal: options.signal,
  });
}

/**
 * A category's first rule must be its base rule (no level, type, area or window).
 *
 * Corresponding REST endpoint: POST /api/v1/sla-rules
 */
export function createSlaRule(payload: CreateSlaRulePayload): Promise<SlaRuleData> {
  return fetchApi<SlaRuleData>('/api/v1/sla-rules', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Partial update. The base rule stays a base rule.
 *
 * Corresponding REST endpoint: PATCH /api/v1/sla-rules/:rule_id
 */
export function updateSlaRule(ruleId: string, payload: UpdateSlaRulePayload): Promise<SlaRuleData> {
  return fetchApi<SlaRuleData>(`/api/v1/sla-rules/${encodeURIComponent(ruleId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/**
 * Deletes one rule. The base rule cannot be deleted.
 *
 * Corresponding REST endpoint: DELETE /api/v1/sla-rules/:rule_id
 */
export function deleteSlaRule(ruleId: string): Promise<SlaRuleData> {
  return fetchApi<SlaRuleData>(`/api/v1/sla-rules/${encodeURIComponent(ruleId)}`, {
    method: 'DELETE',
  });
}
