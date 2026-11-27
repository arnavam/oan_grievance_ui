/**
 * The global SLA policy — mirrors `GlobalSlaPolicyRecord` in
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
