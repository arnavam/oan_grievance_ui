/**
 * The global SLA policy and the per-category SLA windows — mirrors
 * `GlobalSlaPolicyRecord` and `SlaConfigurationRecord` in
 * oan_grievance_service/api/v1/sla_settings.py (STG-412).
 */

/** The radio group's own two values — UI-only, mapped to/from `requires_supervisor_approval` at the state boundary; the wire payload is always the boolean. */
export type DeferralApproval = 'l2_approval' | 'l1_self_approve';

export interface GlobalSlaPolicy {
  /** Most days any single deferral may add to the SLA clock. */
  max_deferral_days: number;
  /** Percent of the SLA window consumed before a case escalates; 100 is at the deadline. */
  auto_escalation_threshold: number;
  /** `true`: a senior (L2) officer decides a deferral. `false`: the assigned (L1) officer may approve it. */
  requires_supervisor_approval: boolean;
  modified?: string | null;
}

export interface GlobalSlaPolicyData {
  policy: GlobalSlaPolicy;
}

/** Partial update; omitted fields stay as they are. */
export type UpdateGlobalSlaPolicyPayload = Partial<
  Pick<GlobalSlaPolicy, 'max_deferral_days' | 'auto_escalation_threshold' | 'requires_supervisor_approval'>
>;

export interface Pagination {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

/** One category's SLA window, shared by every department that serves it. */
export interface SlaConfiguration {
  /** The configuration's id; the identifier PATCH takes. */
  name: string;
  service_category: string;
  /** Departments with an active category assignment for the category. */
  departments: string[];
  sla_days: number;
  auto_escalate: boolean;
  notify_on_breach: boolean;
  modified?: string | null;
}

export interface SlaConfigurationData {
  sla_configuration: SlaConfiguration;
}

export interface SlaConfigurationListData {
  sla_configurations: SlaConfiguration[];
  pagination: Pagination;
}

export interface ListSlaConfigurationsParams {
  page?: number;
  page_size?: number;
  service_category?: string;
  department?: string;
}

/** Partial update; the service category is fixed. */
export type UpdateSlaConfigurationPayload = Partial<
  Pick<SlaConfiguration, 'sla_days' | 'auto_escalate' | 'notify_on_breach'>
>;
