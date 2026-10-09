/**
 * Types for the grievance list screen and detail timeline.
 *
 * `GrievanceListItem` mirrors a row returned by GET /api/v1/grievances
 * (see `oan_grievance_rest_collection.json` → "7b. List Grievances"); `Grievance`
 * is the flattened shape the table and detail sidebar render.
 */

import type { AreaRef } from '@/features/metadata';
import type { ResponseParts } from '@/lib/responseBody';

export interface GrievanceListItem {
  name: string;
  ticket_number: string;
  ticket_number_display?: string | null;
  status: string;
  escalated: boolean;
  submission_channel?: string | null;
  submitter?: string | null;
  submitter_name?: string | null;
  contact_mobile?: string | null;
  contact_email?: string | null;
  is_anonymous: boolean;
  administrative_area?: string | null;
  location?: string | null;
  administrative_hierarchy?: Record<string, string> | null;
  service_category?: string | null;
  grievance_type?: string | null;
  grievance_type_name?: string | null;
  grievance_type_id?: string | null;
  description?: string | null;
  assigned_dept?: string | null;
  /** Alias of `assigned_dept` added by the backend for convenience. */
  department?: string | null;
  assigned_to?: string | null;
  sla_due_date?: string | null;
  confirmation_deadline?: string | null;
  submitted_on?: string | null;
  updated_at?: string | null;
}

export interface GrievanceListPagination {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

/** Payload returned by GET /api/v1/grievances */
export interface GrievanceListData {
  items: GrievanceListItem[];
  pagination: GrievanceListPagination;
}

/** One KPI card from GET /api/v1/grievances/summary */
export interface GrievanceSummaryCard {
  status: string;
  label: string;
  order: number;
  is_open: number;
  is_terminal: number;
  count: number;
}

/** Payload returned by GET /api/v1/grievances/summary */
export interface GrievanceSummaryData {
  cards: GrievanceSummaryCard[];
}

export interface GrievanceListQueryParams {
  page?: number;
  page_size?: number;
  /** Multi-select filters are sent comma-separated, as the backend expects. */
  status?: string[];
  category?: string[];
  region?: string[];
  zone?: string[];
  woreda?: string[];
  kebele?: string[];
  location?: string[];
  administrative_area?: string[];
  grievance_type?: string[];
  department?: string[];
  submission_channel?: string[];
  /** `YYYY-MM-DD` */
  from_date?: string;
  /** `YYYY-MM-DD` */
  to_date?: string;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

/** Row shape rendered by the table and the detail sidebar. */
export interface Grievance {
  id: string;
  ticketId: string;
  ticketNumber?: string;
  ticketNumberDisplay?: string;
  title: string;
  location: string;
  type: string;
  category: string;
  status: string;
  submittedAt: string;
  escalated: boolean;
  isAnonymous: boolean;
  submitterName: string;
  submitterType?: string;
  contactMobile: string;
  contactEmail: string;
  department: string;
  assignedTo: string;
  slaDueDate: string;
  submissionChannel: string;
  description?: string;
  administrativeArea?: string;
  administrativeUnit?: string;
}

/** Filters shared by the advanced-filters sidebar and the table column filters. */
export interface GrievanceFilters {
  status: string[];
  category: string[];
  regions: AreaRef[];
  woredas: AreaRef[];
  kebeles: AreaRef[];
  dateRange: string | null;
  /** `YYYY-MM-DD`, empty when unset. */
  fromDate: string;
  /** `YYYY-MM-DD`, empty when unset. */
  toDate: string;
}

export const EMPTY_GRIEVANCE_FILTERS: GrievanceFilters = {
  status: [],
  category: [],
  regions: [],
  woredas: [],
  kebeles: [],
  dateRange: null,
  fromDate: '',
  toDate: '',
};

/* --- Grievance Timeline Types --- */

export interface TimelineEntry {
  id?: string;
  name?: string;
  entry_type:
    | 'note'
    | 'message'
    | 'response'
    | 'dept_response'
    | 'info_request'
    | 'info_response'
    | 'status_change'
    | 'assignment'
    | 'escalation'
    | 'resolution'
    | 'rejection'
    | 'attachment'
    | 'submission'
    | string;
  is_internal: boolean;
  body: string;
  /** `body` split into its two parts when it is a two-part department response. */
  body_parts?: ResponseParts | null;
  action_taken?: string | null;
  resolution_summary?: string | null;
  response_number?: number;
  author_user?: string | null;
  author_submitter?: string | null;
  author_type?: 'submitter' | 'officer' | 'system' | string;
  author_name?: string | null;
  author_role?: string | null;
  from_status?: string | null;
  to_status?: string | null;
  attachments?: GrievanceTimelineAttachment[];
  ref_doctype?: string | null;
  ref_docname?: string | null;
  action?: string | null;
  created_on: string;
}

export interface TimelineEventItem {
  event_type: string;
  from_status?: string | null;
  to_status?: string | null;
  actor: string;
  actor_role?: string | null;
  message?: string | null;
  communication_channel?: string | null;
  is_internal?: number | boolean;
  creation: string;
  attachments?: GrievanceTimelineAttachment[];
}

export interface GrievanceTimelineSummary {
  description?: string | null;
  desired_outcome?: string | null;
  service_category?: string | null;
  grievance_type?: string | null;
  grievance_type_name?: string | null;
  grievance_type_id?: string | null;
  administrative_area?: string | null;
  administrative_hierarchy?: Record<string, string> | null;
  location?: string | null;
  administrative_unit?: string | null;
  submission_channel?: string | null;
}

export interface GrievanceTimelineSubmitter {
  name?: string | null;
  contact_mobile?: string | null;
  country_code?: string | null;
  phone_number?: string | null;
  contact_email?: string | null;
  submitter_type?: string | null;
  is_anonymous?: boolean;
  assisted_by_officer?: string | null;
}

export interface GrievanceTimelineSla {
  sla_days?: number | null;
  sla_start_at?: string | null;
  sla_due_date?: string | null;
  sla_consumed_percent?: number | null;
  next_escalation_at?: string | null;
  confirmation_deadline?: string | null;
  active_deferral_request?: ChangeRequestData | null;
}

export interface GrievanceTimelineAssignment {
  department?: string | null;
  assigned_to?: string | null;
  routed_automatically?: boolean;
  active_reassignment_request?: ChangeRequestData | null;
}

export interface GrievanceAvailableAction {
  action: string;
  label: string;
  requires_reason: boolean;
  action_code?: string;
  requires_rating?: boolean;
}

export interface GrievanceTimelineAttachment {
  name: string;
  /** Attachment id; `name` is its alias. */
  attachment?: string;
  id?: string;
  timeline_entry?: string | null;
  file_name?: string | null;
  file_url?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  document_type?: string | null;
  scan_status?: string | null;
  uploaded_by_user?: string | null;
  uploaded_by_submitter?: string | null;
  creation?: string | null;
  is_private?: number | boolean;
}

export interface GrievanceTimelineData {
  /** Grievance id (document name): the id realtime events and room subscriptions use. */
  name?: string;
  ticket_number: string;
  ticket_number_display?: string;
  status: string;
  current_status?: string;
  escalated?: boolean;
  submitter_name?: string | null;
  service_category?: string | null;
  grievance_type?: string | null;
  administrative_area?: string | null;
  administrative_hierarchy?: Record<string, string> | null;
  location?: string | null;
  summary?: GrievanceTimelineSummary;
  submitter?: GrievanceTimelineSubmitter;
  sla?: GrievanceTimelineSla;
  assignment?: GrievanceTimelineAssignment;
  available_actions?: GrievanceAvailableAction[];
  can_request_more_info?: boolean;
  attachments?: GrievanceTimelineAttachment[];
  timeline?: TimelineEntry[];
  events?: TimelineEventItem[];
  has_more?: boolean;
  next_cursor?: string | null;
}

export interface ResponseTemplateItem {
  template: string;
  title: string;
  department?: string | null;
  service_category?: string | null;
  /** Template body rendered for the case, as plain text. Prefills the action's `reason`. */
  reason: string;
  /** `reason` split into its two parts; null when the template isn't written in two parts. */
  reason_parts?: ResponseParts | null;
}

export interface ResponseTemplatesData {
  items: ResponseTemplateItem[];
}

export interface GrievanceTimelineQueryParams {
  is_internal?: boolean;
  limit?: number;
  cursor?: string;
}

/**
 * Body of POST /api/v1/grievances/:ticket_number/action (`GrievanceActionRequest`).
 * The text shown to the submitter is either a plain `reason` or, for a
 * department response, its two parts, which the service stores together as
 * the reason.
 */
export type GrievanceActionPayload = {
  /** One of the case's `available_actions`. */
  action: string;
  /** Staff only. Posted as a separate internal timeline entry. */
  internal_notes?: string | null;
  /** Staff only. Response template the reason started from. */
  template?: string | null;
  /** 1-5, on `Close Case` by the submitter only. */
  rating?: number | null;
} & ({ reason: string } | ResponseParts);

export interface GrievanceCurrentState {
  status: string;
  workflow_status?: string;
  escalated: boolean | number;
  assigned_to?: string | null;
  assigned_dept?: string | null;
  department?: string | null;
  updated_at?: string | null;
  available_actions?: GrievanceAvailableAction[];
}

export interface GrievanceActionResult {
  ticket_number: string;
  status?: string;
  message?: string;
  action?: string;
  available_actions?: GrievanceAvailableAction[];
  action_timestamp?: string;
  current_state?: GrievanceCurrentState;
  timeline_event?: TimelineEntry | null;
}

export interface ChangeItem {
  fieldname: string;
  old_value?: string | null;
  new_value?: string | null;
}

export interface ApprovalTrailItem {
  name?: string;
  step_order?: number;
  role?: string | null;
  assigned_user?: string | null;
  status?: string;
  decided_by?: string | null;
  decided_at?: string | null;
  decision_note?: string | null;
}

export interface ChangeRequestData {
  name: string;
  ticket_number: string;
  subject: string;
  reason?: string | null;
  status: 'Pending' | 'Approved' | 'Rejected' | string;
  requested_by: string;
  requested_at?: string | null;
  pending_with?: string | null;
  pending_since?: string | null;
  decided_by?: string | null;
  decided_at?: string | null;
  decision_note?: string | null;
  changes: ChangeItem[];
  trail: ApprovalTrailItem[];
}

export interface ChangeRequestListData {
  items: ChangeRequestData[];
  total?: number;
}

export interface ChangeRequestListQueryParams {
  status?: 'Pending' | 'Approved' | 'Rejected' | string;
  scope?: 'pending_with_me' | 'raised_by_me' | 'all' | string;
  ticket_number?: string;
  limit?: number;
}

export interface GrievanceChangeResponseData {
  ticket_number: string;
  status: string;
  change_request: ChangeRequestData;
  current_state: GrievanceCurrentState;
  timeline_event?: TimelineEntry | null;
  assigned_dept?: string | null;
  assigned_to?: string | null;
  sla_due_date?: string | null;
  is_anonymous?: boolean | null;
  anonymity_status?: string | null;
}

export interface GrievanceChangeResponse {
  status: 'success' | string;
  message?: string | null;
  data: GrievanceChangeResponseData;
}

export interface DeferSLAPayload {
  additional_days: number;
  reason: string;
}

export interface ReassignGrievancePayload {
  target_department: string;
  target_officer?: string | null;
  reason?: string | null;
  sla_treatment?: 'Continue' | 'Reset' | string;
}

export interface RaiseChangeRequestPayload {
  subject: string;
  reason?: string | null;
  changes: Array<{
    fieldname: string;
    new_value?: string | null;
  }>;
}

export interface DecideChangeRequestPayload {
  decision: 'Approved' | 'Rejected' | string;
  note?: string | null;
}

