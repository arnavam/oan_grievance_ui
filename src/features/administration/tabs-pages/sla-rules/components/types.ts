/**
 * SLA rules as administrators manage them — mirrors `SlaRuleRecord` in
 * oan_grievance_service/api/v1/sla_rules.py.
 */

export interface SlaRule {
  /** The rule's id; the identifier GET, PATCH and DELETE take. */
  name: string;
  service_category: string;
  /** The category's base rule: no level, type, area or window. It cannot be deleted or narrowed. */
  is_base: boolean;
  rule_label: string | null;
  /** Escalation rung the days are for. Null: the days for the whole case, the ones the SLA clock runs on. */
  role_level: string | null;
  grievance_type: string | null;
  administrative_area: string | null;
  /** All four window fields, or none for all year. */
  start_month: number | null;
  start_day: number | null;
  end_month: number | null;
  end_day: number | null;
  sla_days: number;
  is_urgent: boolean;
  /** `Urgent` for an urgent rule, null otherwise. Read only. */
  priority: 'Urgent' | null;
  modified?: string | null;
}

export interface Pagination {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface SlaRuleData {
  rule: SlaRule;
}

export interface SlaRuleListData {
  rules: SlaRule[];
  pagination: Pagination;
}

export interface SlaRuleListParams {
  page?: number;
  page_size?: number;
  service_category?: string;
  role_level?: string;
  grievance_type?: string;
  administrative_area?: string;
  is_urgent?: boolean;
  is_base?: boolean;
}

/** The scope a rule may name; blank or null means "every". */
type SlaRuleScope = Partial<
  Pick<
    SlaRule,
    | 'rule_label'
    | 'role_level'
    | 'grievance_type'
    | 'administrative_area'
    | 'start_month'
    | 'start_day'
    | 'end_month'
    | 'end_day'
  >
>;

export interface CreateSlaRulePayload extends SlaRuleScope {
  /** Id, name or code of the category. */
  service_category: string;
  sla_days: number;
  is_urgent?: boolean;
}

/** Partial; omitted fields stay, `null` clears a scope field. The category is fixed. */
export type UpdateSlaRulePayload = SlaRuleScope & Partial<Pick<SlaRule, 'sla_days' | 'is_urgent'>>;
