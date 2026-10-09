import { fetchApi } from '@/lib/api';
import type {
  ChangeRequestData,
  ChangeRequestListData,
  ChangeRequestListQueryParams,
  DecideChangeRequestPayload,
  DeferSLAPayload,
  GrievanceActionPayload,
  GrievanceActionResult,
  GrievanceChangeResponseData,
  GrievanceListData,
  GrievanceListQueryParams,
  GrievanceSummaryData,
  GrievanceTimelineData,
  GrievanceTimelineQueryParams,
  ResponseTemplatesData,
  RaiseChangeRequestPayload,
  ReassignGrievancePayload,
} from '../types';


export interface RequestOptions {
  signal?: AbortSignal;
}

function buildListQuery(params: GrievanceListQueryParams): string {
  const searchParams = new URLSearchParams();

  const setScalar = (key: string, value: string | number | undefined) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.set(key, String(value));
  };

  // The backend accepts multi-select filters as comma-separated values.
  const setMulti = (key: string, values: string[] | undefined) => {
    if (!values || values.length === 0) return;
    searchParams.set(key, values.join(','));
  };

  setScalar('page', params.page);
  setScalar('page_size', params.page_size);
  setMulti('status', params.status);
  setMulti('category', params.category);
  setMulti('region', params.region);
  setMulti('zone', params.zone);
  setMulti('woreda', params.woreda);
  setMulti('kebele', params.kebele);
  setMulti('location', params.location);
  setMulti('administrative_area', params.administrative_area);
  setMulti('grievance_type', params.grievance_type);
  setMulti('department', params.department);
  setMulti('submission_channel', params.submission_channel);
  setScalar('from_date', params.from_date);
  setScalar('to_date', params.to_date);
  setScalar('search', params.search?.trim());
  setScalar('sort_by', params.sort_by);
  setScalar('sort_order', params.sort_order);

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

function buildTimelineQuery(params: GrievanceTimelineQueryParams): string {
  const searchParams = new URLSearchParams();

  if (params.is_internal !== undefined) {
    searchParams.set('is_internal', String(params.is_internal));
  }
  searchParams.set('limit', String(params.limit !== undefined ? params.limit : 50));
  if (params.cursor) {
    searchParams.set('cursor', params.cursor);
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Protected list endpoint for Grievance Submitters, Officers, and Administrators.
 * Returns a page of grievances scoped by the caller's RBAC permissions, with
 * multi-select filtering on status, category, region, type, department, and channel.
 *
 * Corresponding REST endpoint: GET /api/v1/grievances
 */
export async function fetchGrievances(
  params: GrievanceListQueryParams = {},
  options: RequestOptions = {}
): Promise<GrievanceListData> {
  return fetchApi<GrievanceListData>(`/api/v1/grievances${buildListQuery(params)}`, {
    method: 'GET',
    signal: options.signal,
  });
}

/**
 * Status KPI card counts for the All Grievances page header metrics.
 * Labels and ordering come from the backend so the UI does not hard-code statuses.
 *
 * Corresponding REST endpoint: GET /api/v1/grievances/summary
 */
export async function fetchGrievanceSummary(
  options: RequestOptions = {}
): Promise<GrievanceSummaryData> {
  return fetchApi<GrievanceSummaryData>('/api/v1/grievances/summary', {
    method: 'GET',
    signal: options.signal,
  });
}

/**
 * Retrieves the complete chronological audit log, state transitions, conversation
 * thread, case details, SLA progress, and assignments for a given grievance.
 *
 * Corresponding REST endpoint: GET /api/v1/grievances/:ticket_number/timeline
 */
export async function fetchGrievanceTimeline(
  ticketNumber: string,
  params: GrievanceTimelineQueryParams = {},
  options: RequestOptions = {}
): Promise<GrievanceTimelineData> {
  return fetchApi<GrievanceTimelineData>(
    `/api/v1/grievances/${encodeURIComponent(ticketNumber)}/timeline${buildTimelineQuery(params)}`,
    {
      method: 'GET',
      signal: options.signal,
    }
  );
}

/**
 * Posts to the case thread: a public message, or an internal note when staff
 * send `isInternal`. Never moves the case — a reply to an information request
 * is the `Submitter Reply` action on /action.
 *
 * Corresponding REST endpoint: POST /api/v1/grievances/:ticket_number/message
 */
export interface PostMessageOptions extends RequestOptions {
  clientMessageId?: string;
}

export async function postGrievanceMessage(
  ticketNumber: string,
  body: string,
  isInternal = false,
  options: PostMessageOptions = {}
): Promise<GrievanceActionResult> {
  const client_message_id =
    options.clientMessageId ||
    (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined);
  return fetchApi<GrievanceActionResult>(
    `/api/v1/grievances/${encodeURIComponent(ticketNumber)}/message`,
    {
      method: 'POST',
      body: JSON.stringify({
        ticket_number: ticketNumber,
        body,
        is_internal: isInternal,
        client_message_id,
      }),
      signal: options.signal,
    }
  );
}

/**
 * Response templates for a response type, rendered with this grievance's details.
 *
 * Corresponding REST endpoint: GET /api/v1/grievances/:ticket_number/response-templates
 */
export async function fetchResponseTemplates(
  ticketNumber: string,
  action: string,
  options: RequestOptions = {}
): Promise<ResponseTemplatesData> {
  const query = new URLSearchParams({ action }).toString();
  return fetchApi<ResponseTemplatesData>(
    `/api/v1/grievances/${encodeURIComponent(ticketNumber)}/response-templates?${query}`,
    { method: 'GET', signal: options.signal }
  );
}

/**
 * Records an internal staff note on the grievance case (staff only). The
 * service has no separate note route: a note is a message with `is_internal`.
 *
 * Corresponding REST endpoint: POST /api/v1/grievances/:ticket_number/message
 */
export async function addGrievanceNote(
  ticketNumber: string,
  body: string,
  isInternal = true,
  options: RequestOptions = {}
): Promise<GrievanceActionResult> {
  return postGrievanceMessage(ticketNumber, body, isInternal, options);
}

/**
 * Takes a workflow action on a grievance — one of the case's `available_actions`,
 * by an officer or the submitter. Every action carries a `reason` the
 * submitter sees; an officer action that response types map onto names one.
 *
 * Corresponding REST endpoint: POST /api/v1/grievances/:ticket_number/action
 */
export async function executeGrievanceAction(
  ticketNumber: string,
  payload: GrievanceActionPayload,
  options: RequestOptions = {}
): Promise<GrievanceActionResult> {
  return fetchApi<GrievanceActionResult>(
    `/api/v1/grievances/${encodeURIComponent(ticketNumber)}/action`,
    {
      method: 'POST',
      // The request model forbids unknown fields, so only the spec's
      // fields are sent, and unset optional ones are left out entirely.
      body: JSON.stringify({
        ticket_number: ticketNumber,
        action: payload.action,
        ...('reason' in payload
          ? { reason: payload.reason }
          : {
              action_taken: payload.action_taken,
              resolution_summary: payload.resolution_summary,
            }),
        ...(payload.internal_notes ? { internal_notes: payload.internal_notes } : {}),
        ...(payload.template ? { template: payload.template } : {}),
        ...(payload.rating != null ? { rating: payload.rating } : {}),
      }),
      signal: options.signal,
    }
  );
}

/**
 * Reassigns a grievance to a target department and/or officer.
 * A shorthand for a change request. It is applied at once when the caller already
 * stands above the case (supervisor/admin); otherwise it creates a pending change request.
 *
 * Corresponding REST endpoint: POST /api/v1/grievances/:ticket_number/reassign
 */
export async function reassignGrievance(
  ticketNumber: string,
  payload: ReassignGrievancePayload,
  options: RequestOptions = {}
): Promise<GrievanceChangeResponseData> {
  return fetchApi<GrievanceChangeResponseData>(
    `/api/v1/grievances/${encodeURIComponent(ticketNumber)}/reassign`,
    {
      method: 'POST',
      body: JSON.stringify({
        ticket_number: ticketNumber,
        target_department: payload.target_department,
        target_officer: payload.target_officer ?? null,
        reason: payload.reason ?? null,
        ...(payload.sla_treatment ? { sla_treatment: payload.sla_treatment } : {}),
      }),
      signal: options.signal,
    }
  );
}

/**
 * Extends the SLA deadline for a grievance via approved deferral.
 * A shorthand for a change request on `sla_due_date`, decided up the hierarchy
 * unless deferral policy lets officers defer without a supervisor.
 *
 * Corresponding REST endpoint: POST /api/v1/grievances/:ticket_number/defer-sla
 */
export async function deferGrievanceSLA(
  ticketNumber: string,
  payload: DeferSLAPayload,
  options: RequestOptions = {}
): Promise<GrievanceChangeResponseData> {
  return fetchApi<GrievanceChangeResponseData>(
    `/api/v1/grievances/${encodeURIComponent(ticketNumber)}/defer-sla`,
    {
      method: 'POST',
      body: JSON.stringify({
        ticket_number: ticketNumber,
        additional_days: payload.additional_days,
        reason: payload.reason,
      }),
      signal: options.signal,
    }
  );
}

/**
 * Requests field modifications on an active grievance via formal change request.
 *
 * Corresponding REST endpoint: POST /api/v1/grievances/:ticket_number/change-requests
 */
export async function raiseChangeRequest(
  ticketNumber: string,
  payload: RaiseChangeRequestPayload,
  options: RequestOptions = {}
): Promise<ChangeRequestData> {
  return fetchApi<ChangeRequestData>(
    `/api/v1/grievances/${encodeURIComponent(ticketNumber)}/change-requests`,
    {
      method: 'POST',
      body: JSON.stringify({
        ticket_number: ticketNumber,
        ...payload,
      }),
      signal: options.signal,
    }
  );
}

/**
 * Lists change requests visible to the caller (filtered by scope: pending_with_me, raised_by_me, all).
 *
 * Corresponding REST endpoint: GET /api/v1/change-requests
 */
export async function fetchChangeRequests(
  params: ChangeRequestListQueryParams = {},
  options: RequestOptions = {}
): Promise<ChangeRequestListData> {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set('status', params.status);
  if (params.scope) searchParams.set('scope', params.scope);
  if (params.ticket_number) searchParams.set('ticket_number', params.ticket_number);
  if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
  const query = searchParams.toString() ? `?${searchParams.toString()}` : '';

  return fetchApi<ChangeRequestListData>(`/api/v1/change-requests${query}`, {
    method: 'GET',
    signal: options.signal,
  });
}

/**
 * Retrieves details of a specific change request.
 *
 * Corresponding REST endpoint: GET /api/v1/change-requests/:name
 */
export async function fetchChangeRequest(
  name: string,
  options: RequestOptions = {}
): Promise<ChangeRequestData> {
  return fetchApi<ChangeRequestData>(
    `/api/v1/change-requests/${encodeURIComponent(name)}`,
    {
      method: 'GET',
      signal: options.signal,
    }
  );
}

/**
 * Decides (Approve/Reject) on a pending change request.
 *
 * Corresponding REST endpoint: POST /api/v1/change-requests/:name/decide
 */
export async function decideChangeRequest(
  name: string,
  payload: DecideChangeRequestPayload,
  options: RequestOptions = {}
): Promise<ChangeRequestData> {
  return fetchApi<ChangeRequestData>(
    `/api/v1/change-requests/${encodeURIComponent(name)}/decide`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
      signal: options.signal,
    }
  );
}

/**
 * Approves or rejects an anonymity request for a grievance.
 *
 * Corresponding REST endpoint: POST /api/v1/grievances/:ticket_number/anonymity-decision
 */
export async function decideGrievanceAnonymity(
  ticketNumber: string,
  payload: {
    decision: 'Approved' | 'Rejected' | string;
    reason?: string | null;
  },
  options: RequestOptions = {}
): Promise<GrievanceActionResult> {
  return fetchApi<GrievanceActionResult>(
    `/api/v1/grievances/${encodeURIComponent(ticketNumber)}/anonymity-decision`,
    {
      method: 'POST',
      body: JSON.stringify({
        ticket_number: ticketNumber,
        ...payload,
      }),
      signal: options.signal,
    }
  );
}

/** Service object matching the OAN A2C enterprise standard */
export const grievanceService = {
  listGrievances: fetchGrievances,
  getSummary: fetchGrievanceSummary,
  getTimeline: fetchGrievanceTimeline,
  postMessage: postGrievanceMessage,
  getResponseTemplates: fetchResponseTemplates,
  addNote: addGrievanceNote,
  executeAction: executeGrievanceAction,
  reassign: reassignGrievance,
  deferSLA: deferGrievanceSLA,
  raiseChangeRequest,
  getChangeRequests: fetchChangeRequests,
  getChangeRequest: fetchChangeRequest,
  decideChangeRequest,
  decideAnonymity: decideGrievanceAnonymity,
};

