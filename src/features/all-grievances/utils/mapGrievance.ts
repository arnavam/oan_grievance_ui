import type {
  Grievance,
  GrievanceListItem,
  GrievanceTimelineAttachment,
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

/** First line of the description, used as the row title. */
function deriveTitle(description?: string | null): string {
  if (!description) return 'Untitled grievance';
  const firstLine = description.split(/\r?\n/).find((line) => line.trim().length > 0);
  const text = (firstLine ?? description).trim();
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
    title: deriveTitle(item.description),
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
    submissionChannel: item.submission_channel ?? '',
    description: item.description ?? '',
    administrativeArea: item.administrative_area ?? '',
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
  response: 'Dept Response',
  dept_response: 'Dept Response',
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
  } else if ((entry as TimelineEntry).author_user) {
    authorType = 'officer';
  } else if ((entry as TimelineEntry).author_submitter) {
    authorType = 'submitter';
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
  const authorSubmitter = (entry as TimelineEntry).author_submitter;

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
      authorName = context?.submitterName || (authorSubmitter ? `Submitter (${authorSubmitter})` : (authorRole || 'Submitter'));
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
      ? `Dept Response #${respNum}`
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
