import type {
  Grievance,
  GrievanceListItem,
  GrievanceTimelineAttachment,
  GrievanceTimelineData,
  TimelineEntry,
  TimelineEventItem,
} from '../types';

/**
 * Frappe returns naive datetimes ("2026-05-28 10:42:13.123456"). `new Date` treats
 * that space-separated form inconsistently across engines, so normalise to ISO-ish
 * local time before parsing.
 */
function parseBackendDate(value?: string | null): Date | null {
  if (!value) return null;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(value?: string | null): string {
  const date = parseBackendDate(value);
  if (!date) return '';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(value?: string | null): string {
  const date = parseBackendDate(value);
  if (!date) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Formats location as "Woreda / Region".
 * Handles administrative_hierarchy, location string, and administrative_area dotted path codes.
 */
export function formatLocation(item: GrievanceListItem): string {
  const h = item.administrative_hierarchy;
  if (h) {
    const woreda = (h.woreda || h.woreda_name || h.woreda_id || '').trim();
    const region = (h.region || h.region_name || h.region_id || '').trim();
    if (woreda && region) return `${woreda} / ${region}`;
    if (woreda) return woreda;
    if (region) return region;
  }

  if (item.location) {
    const loc = item.location.trim();
    if (loc.includes('/')) return loc;
    const parts = loc.split(',').map((p) => p.trim()).filter(Boolean);
    const nonCountry = parts.filter((p) => p.toLowerCase() !== 'ethiopia');
    if (nonCountry.length === 2) {
      // [woreda, region]
      return `${nonCountry[0]} / ${nonCountry[1]}`;
    }
    if (nonCountry.length === 3) {
      // [woreda, zone, region]
      return `${nonCountry[0]} / ${nonCountry[2]}`;
    }
    if (nonCountry.length >= 4) {
      // [kebele, woreda, zone, region] -> woreda / region
      const woreda = nonCountry[1];
      const region = nonCountry[nonCountry.length - 1];
      return `${woreda} / ${region}`;
    }
    return loc;
  }

  if (item.administrative_area) {
    const area = item.administrative_area.trim();
    if (area.includes('.')) {
      const parts = area.split('.').filter(Boolean);
      // e.g. ET.OR.BSH -> BSH / OR
      if (parts.length === 3) {
        return `${parts[2]} / ${parts[1]}`;
      }
      if (parts.length === 2) {
        return parts.reverse().join(' / ');
      }
      return parts.join(' / ');
    }
    return area;
  }

  return '';
}

/**
 * Start of the stand-in description a voice-only grievance is filed with
 * (`VOICE_NOTE_DESCRIPTION` in submit-grievance/submitPayload.ts; features may
 * not import each other). Such a case gets a short default title instead.
 */
const VOICE_NOTE_DESCRIPTION_PREFIX = 'Voice grievance - ';
const VOICE_GRIEVANCE_TITLE = 'Voice grievance';

/** Whether a submission channel names a voice/phone one (the list carries no attachment info). */
const isVoiceChannel = (channel?: string | null): boolean => /voice|ivr|phone|call/i.test(channel ?? '');

/**
 * First line of the description, used as the row title. A voice grievance
 * (`isVoice`, or the stand-in description) gets a default title whether or not
 * it has a description; any other case without one is named by its ticket.
 */
export function deriveTitle(description?: string | null, opts: { isVoice?: boolean; ticket?: string } = {}): string {
  const firstLine = description?.split(/\r?\n/).find((line) => line.trim().length > 0);
  const text = (firstLine ?? description ?? '').trim();
  if ((opts.isVoice && !text) || text.startsWith(VOICE_NOTE_DESCRIPTION_PREFIX)) {
    return VOICE_GRIEVANCE_TITLE;
  }
  if (!text) return opts.ticket ? `Grievance ${opts.ticket}` : 'Untitled grievance';
  return text.length > 140 ? `${text.slice(0, 137)}…` : text;
}

export function mapGrievanceListItem(item: GrievanceListItem): Grievance {
  const submitterName = item.is_anonymous ? 'Anonymous' : (item.submitter_name ?? '');
  const location = formatLocation(item);

  return {
    id: item.name,
    ticketNumber: item.ticket_number || item.name,
    ticketId: item.ticket_number_display || item.ticket_number || item.name,
    ticketNumberDisplay: item.ticket_number_display ?? undefined,
    title: deriveTitle(item.description, {
      isVoice: isVoiceChannel(item.submission_channel),
      ticket: item.ticket_number_display || item.ticket_number || item.name,
    }),
    location,
    type: (item.grievance_type_name || item.grievance_type) ?? '',
    category: item.service_category ?? '',
    status: item.status,
    submittedAt: formatDateTime(item.submitted_on),
    escalated: Boolean(item.escalated),
    isAnonymous: Boolean(item.is_anonymous),
    submitterName,
    contactMobile: item.is_anonymous ? '' : (item.contact_mobile ?? ''),
    contactEmail: item.is_anonymous ? '' : (item.contact_email ?? ''),
    department: item.department ?? item.assigned_dept ?? '',
    assignedTo: item.assigned_to ?? '',
    slaDueDate: formatDate(item.sla_due_date),
    // Only an SLA breach is a reminder; an auto-close date or a held clock is not.
    slaDueAt: item.due_kind === 'sla_breach' && !item.is_paused ? (item.due_date ?? undefined) : undefined,
    canAct: item.can_act ?? undefined,
    autoCloseAt: item.auto_close_at ?? (item.due_kind === 'auto_close' ? item.due_date : undefined) ?? undefined,
    submissionChannel: item.submission_channel ?? '',
    description: item.description ?? '',
    administrativeArea: item.administrative_area ?? '',
    possibleDuplicateOf: item.possible_duplicate_of ?? undefined,
    duplicateOf: item.duplicate_of ?? undefined,
    isSensitive: Boolean(item.is_sensitive),
    isUrgent: item.handling_class === 'Urgent',
  };
}

/**
 * Builds the row-shaped `Grievance` from a case's timeline alone, for a case
 * opened by link (a notification) rather than picked from the list. The
 * panels read the timeline first, so only the fallbacks need filling.
 */
export function grievanceFromTimeline(data: GrievanceTimelineData): Grievance {
  const ticket = data.ticket_number || data.name || '';
  const anonymous = Boolean(data.submitter?.is_anonymous);
  return {
    id: data.name ?? ticket,
    ticketNumber: ticket,
    ticketId: data.ticket_number_display || ticket,
    ticketNumberDisplay: data.ticket_number_display,
    title: deriveTitle(data.summary?.description ?? data.description, {
      isVoice: isVoiceChannel(data.summary?.submission_channel ?? data.submission_channel),
      ticket: data.ticket_number_display || ticket,
    }),
    location: data.summary?.location || data.location || '',
    type: data.summary?.grievance_type_name || data.summary?.grievance_type || data.grievance_type || '',
    category: data.summary?.service_category || data.service_category || '',
    status: data.status || data.current_status || '',
    submittedAt: formatDateTime(data.sla?.sla_start_at),
    escalated: Boolean(data.escalated),
    isAnonymous: anonymous,
    submitterName: anonymous ? 'Anonymous' : (data.submitter?.name ?? data.submitter_name ?? ''),
    submitterType: data.submitter?.submitter_type ?? undefined,
    contactMobile: anonymous ? '' : (data.submitter?.contact_mobile ?? ''),
    contactEmail: anonymous ? '' : (data.submitter?.contact_email ?? ''),
    department: data.assignment?.department ?? '',
    assignedTo: data.assignment?.assigned_to ?? '',
    slaDueDate: formatDate(data.sla?.sla_due_date),
    submissionChannel: data.summary?.submission_channel ?? data.submission_channel ?? '',
    description: data.summary?.description ?? data.description ?? '',
    administrativeArea: data.summary?.administrative_area || data.administrative_area || '',
    possibleDuplicateOf: data.possible_duplicate?.ticket_number ?? undefined,
    duplicateOf: data.duplicate_of ?? undefined,
  };
}

/**
 * Extract 1-2 letter initials for an author or actor name.
 */
export function getInitials(name?: string | null): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  const first = parts[0] ?? '';
  if (parts.length === 1) {
    if (first.includes('@')) {
      const emailUser = first.split('@')[0] || '';
      return emailUser.length >= 2 ? emailUser.slice(0, 2).toUpperCase() : emailUser.toUpperCase() || '??';
    }
    return first.length >= 2 ? first.slice(0, 2).toUpperCase() : (first || '??').toUpperCase();
  }
  const last = parts[parts.length - 1] ?? '';
  const firstChar = first[0] ?? '';
  const lastChar = last[0] ?? '';
  const result = (firstChar + lastChar).toUpperCase();
  return result || '??';
}

export interface FormattedTimelineEvent {
  id: string;
  entryType: string;
  typeLabel: string;
  isInternal: boolean;
  body: string;
  authorName: string;
  authorRole?: string;
  authorType: 'submitter' | 'officer' | 'system';
  initials: string;
  formattedDate: string;
  rawDate: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  action?: string | null;
  responseNumber?: number;
  actionTaken?: string | null;
  resolutionSummary?: string | null;
  attachments?: GrievanceTimelineAttachment[];
}

export interface TimelineContext {
  submitterName?: string | null;
  submitterType?: string | null;
  isAnonymous?: boolean;
}

const ENTRY_TYPE_LABELS: Record<string, string> = {
  note: 'Internal Note',
  message: 'Public Message',
  response: 'Department Response',
  dept_response: 'Department Response',
  info_request: 'Info Request',
  info_response: 'Info Response',
  status_change: 'Status Change',
  assignment: 'Assignment',
  escalation: 'Escalation',
  resolution: 'Resolution',
  rejection: 'Rejection',
  attachment: 'Attachment',
  submission: 'Submission',
  'Status Change': 'Status Change',
  'Submission': 'Submission',
  'Assignment': 'Assignment',
  'Note': 'Note',
  'Message': 'Message',
  'Escalation': 'Escalation',
  'Resolution': 'Resolution',
  'Reopen': 'Reopened',
  'Rejection': 'Rejected',
};

export function normalizeTimelineEntry(
  entry: TimelineEntry | TimelineEventItem,
  index = 0,
  context?: TimelineContext
): FormattedTimelineEvent {
  // Support both backend schema (`TimelineEntry`) and OpenAPI schema (`TimelineEventItem`)
  const rawType = (entry as TimelineEntry).entry_type || (entry as TimelineEventItem).event_type || 'message';
  const rawCreated = (entry as TimelineEntry).created_on || (entry as TimelineEventItem).creation || '';
  const isInternal = Boolean(entry.is_internal);

  const authorRole = (entry as TimelineEntry).author_role || (entry as TimelineEventItem).actor_role || undefined;

  let authorType: 'submitter' | 'officer' | 'system' = 'submitter';
  if ((entry as TimelineEntry).author_type) {
    authorType = (entry as TimelineEntry).author_type as 'submitter' | 'officer' | 'system';
  } else if (
    isInternal ||
    rawType === 'response' ||
    rawType === 'dept_response' ||
    rawType === 'status_change' ||
    rawType === 'assignment' ||
    rawType === 'resolution' ||
    rawType === 'rejection'
  ) {
    authorType = 'officer';
  }

  const explicitName = (entry as TimelineEntry).author_name || (entry as TimelineEventItem).actor;

  let authorName: string;
  if (explicitName) {
    authorName = explicitName;
  } else if (authorType === 'officer') {
    // Officers should be displayed by their official role/designation (e.g. 'Nodal Officer'),
    // never exposing personal names/emails to preserve officer anonymity.
    authorName = authorRole || 'Grievance Officer';
  } else if (authorType === 'submitter') {
    if (context?.isAnonymous) {
      authorName = 'Anonymous Submitter';
    } else {
      authorName = context?.submitterName || authorRole || 'Submitter';
    }
  } else if (authorType === 'system') {
    authorName = 'System';
  } else {
    authorName = authorRole || (isInternal ? 'Grievance Officer' : 'Submitter');
  }

  const body = (entry as TimelineEntry).body || (entry as TimelineEventItem).message || '';
  const respNum = (entry as TimelineEntry).response_number;
  const typeLabel =
    (rawType === 'dept_response' || rawType === 'response') && respNum
      ? `Department Response #${respNum}`
      : (ENTRY_TYPE_LABELS[rawType] || rawType);
  const entryId = (entry as TimelineEntry).id || (entry as TimelineEntry).name || `evt-${index}-${rawCreated}`;

  return {
    id: entryId,
    entryType: rawType,
    typeLabel,
    isInternal,
    body,
    authorName,
    authorRole,
    authorType,
    initials: getInitials(authorName),
    formattedDate: formatDateTime(rawCreated),
    rawDate: rawCreated,
    fromStatus: (entry as TimelineEntry).from_status || (entry as TimelineEventItem).from_status,
    toStatus: (entry as TimelineEntry).to_status || (entry as TimelineEventItem).to_status,
    action: (entry as TimelineEntry).action || null,
    responseNumber: (entry as TimelineEntry).response_number,
    actionTaken: (entry as TimelineEntry).action_taken,
    resolutionSummary: (entry as TimelineEntry).resolution_summary,
    attachments: entry.attachments,
  };
}

/**
 * Checks whether a given grievance status string is considered terminal.
 * Looks up against metadata statuses (where is_terminal === 1) if provided,
 * otherwise falls back to standard terminal status names ('Closed', 'Rejected').
 */
export function isTerminalStatus(
  status?: string | null,
  statusOptions?: Array<{ status: string; is_terminal?: number }> | null
): boolean {
  if (!status) return false;
  const normalized = status.trim().toLowerCase();
  // A confirmed duplicate is read-only whatever the status list says: its main ticket is where the case is worked.
  if (normalized === 'duplicate') return true;
  if (statusOptions && statusOptions.length > 0) {
    const match = statusOptions.find((opt) => opt.status.trim().toLowerCase() === normalized);
    if (match && typeof match.is_terminal === 'number') {
      return match.is_terminal === 1;
    }
  }
  return normalized === 'closed' || normalized === 'rejected';
}
