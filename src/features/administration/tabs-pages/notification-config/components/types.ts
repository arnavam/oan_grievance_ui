export interface PlaceholderItem {
    key?: string;
    field?: string;
    name?: string;
    label: string;
    description?: string;
    example?: string;
}

export interface PlaceholdersResponseData {
    placeholders: PlaceholderItem[];
    total_count: number;
}

export interface NotificationTemplate {
    name: string;
    event: string;
    channel: string; // 'SMS' | 'Email'
    recipient_type: string;
    role_level?: string | null;
    role_level_name?: string | null;
    subject: string;
    body: string;
    enabled: boolean;
    condition?: string | null;
    placeholders?: string[];
    raw_subject?: string | null;
    raw_body?: string | null;
    translations?: Record<string, unknown>;
}

export interface NotificationTemplateListData {
    templates: NotificationTemplate[];
    pagination?: {
        page: number;
        page_size: number;
        total_count: number;
        total_pages: number;
        has_next: boolean;
        has_prev: boolean;
    };
}

export interface NotificationTemplateData {
    template: NotificationTemplate;
}

export interface NotificationTemplateListParams {
    event?: string;
    channel?: string;
    recipient_type?: string;
    role_level?: string;
    enabled?: boolean | string;
    page?: number;
    page_size?: number;
}

export interface UpdateNotificationTemplatePayload {
    subject?: string;
    body?: string;
    enabled?: boolean;
    recipient_type?: string;
    role_level?: string | null;
    recipient_id?: string | null;
    translations?: Record<string, unknown>;
}

export interface FlatRecipientOption {
    id: string;
    label: string;
    recipient_type: string;
    role_level?: string | null;
    role_level_name?: string | null;
}

export interface RoleLevelOption {
    level_code: string;
    level_name: string;
    level_order: number;
    escalation_hours?: number | null;
    description?: string | null;
}

export interface NotificationTemplateOptionsData {
    channels: string[];
    recipients: FlatRecipientOption[];
    placeholders: PlaceholderItem[];
    role_levels: RoleLevelOption[];
}


export interface NotificationConfig {
    id: string;
    title?: string;
    eventType?: string;
    active: boolean;
    channel: ('SMS' | 'Email')[];
    subject: string;
    trigger: string;
    recipients: string[];
    template?: string;
    lastEdited?: string;
}

export const MOCK_CORE_NOTIFICATIONS: NotificationConfig[] = [

    {
        id: "EC-001",
        title: "Submission Received",
        subject: "Grievance {ticket_number} Received — OAN Ethiopia",
        recipients: ["Submitter"],
        channel: ["SMS", "Email"],
        trigger: "Immediately on save",
        active: true,
        template: "Dear {submitter_name},\n\nYour grievance has been successfully registered on the OAN Ethiopia Portal.\n\nTicket Number: {ticket_number}\nService Category: {service_category}\nGrievance Type: {grievance_type}\nAssigned Department: {assigned_dept}\nSLA Window: {sla_days} working days\n\nYou will be notified of all updates via SMS and email.\n\nOAN Ethiopia Grievance Portal",
        lastEdited: "2026-04-01T09:00:00Z",
    },
    {
        id: "EC-002",
        title: "Duplicate Detected",
        subject: "Possible Duplicate Submission — Grievance {ticket_number}",
        recipients: ["Submitter"],
        channel: ["SMS", "Email"],
        trigger: "On validation",
        active: true,
        template: "Dear {submitter_name},\n\nA similar grievance ({existingId}) was recently submitted by your account.\n\nIf this is a new issue, please proceed with justification. Otherwise, you may track your existing grievance using the ticket number above.\n\nOAN Ethiopia Grievance Portal",
        lastEdited: "2026-04-01T09:00:00Z",
    },
    {
        id: "EC-003",
        eventType: "Grievance Assigned (Auto-routing)",
        subject: "[OAN] Grievance {ticket_number} Assigned — Action Required",
        recipients: ["L1 Officer"],
        channel: ["Email"],
        trigger: "On auto-routing match",
        active: true,
        template: "Dear {assigned_to},\n\nGrievance {ticket_number} has been automatically assigned to your department.\n\nSubmitter: {submitter_name} ({submitter_type})\nCategory: {service_category} — {grievance_type}\nPriority: {priority}\nLocation: {region}, {woreda}, {kebele}\nSLA Deadline: {sla_due_date}\n\nPlease log in to the OAN Portal to review and action this grievance.\n\nOAN Ethiopia System",
        lastEdited: "2026-04-05T10:30:00Z",
    },
    {
        id: "EC-004",
        title: "Grievance Assigned (Manual Routing)",
        subject: "[OAN] Grievance {ticket_number} Manually Assigned",
        recipients: ["L1 Officer"],
        channel: ["Email"],
        trigger: "On nodal officer assignment",
        active: true,
        template: "Dear {assigned_to},\n\nGrievance {ticket_number} has been manually assigned to your department by the Nodal Officer.\n\nSubmitter: {submitter_name}\nCategory: {service_category} — {grievance_type}\nSLA Deadline: {sla_due_date}\n\nPlease action promptly.\n\nOAN Ethiopia System",
        lastEdited: "2026-04-05T10:30:00Z",
    },
    {
        id: "EC-005",
        title: "Status → In Progress",
        subject: "Your Grievance {ticket_number} Is Being Processed",
        recipients: ["Submitter"],
        channel: ["SMS"],
        trigger: "Officer accepts ticket",
        active: true,
        template: "OAN: Grievance {ticket_number} is now In Progress. Department: {assigned_dept}. Officer: {assigned_to}. We will update you shortly. Reply STOP to opt out.",
        lastEdited: "2026-04-10T14:00:00Z",
    },
    {
        id: "EC-006",
        title: "More Information Requested",
        subject: "Additional Information Needed — Grievance {ticket_number}",
        recipients: ["Submitter"],
        channel: ["SMS", "Email"],
        trigger: "Officer sets More Info Needed",
        active: true,
        template: "Dear {submitter_name},\n\nThe officer handling your grievance ({ticket_number}) requires additional information to proceed.\n\nInformation requested: {infoRequest}\n\nPlease respond by: {responseDeadline}\n\nYou can reply via the OAN portal or call our helpline. Delays in responding may pause your SLA clock.\n\nOAN Ethiopia Grievance Portal",
        lastEdited: "2026-04-10T14:00:00Z",
    },
    {
        id: "EC-007",
        title: "Submitter Responds to Info Request",
        subject: "Submitter Response Received — Grievance {ticket_number}",
        recipients: ["L1 Officer"],
        channel: ["Email"],
        trigger: "Submitter provides requested info",
        active: true,
        template: "Dear {assigned_to},\n\nThe submitter has responded to your information request for grievance {ticket_number}.\n\nResponse: {submitterResponse}\n\nPlease review and continue processing.\n\nOAN Ethiopia System",
        lastEdited: "2026-04-15T09:00:00Z",
    },
    {
        id: "EC-008",
        title: "Structured Response Sent to Submitter",
        subject: "Department Response on Grievance {ticket_number}",
        recipients: ["Submitter"],
        channel: ["SMS", "Email"],
        trigger: "Officer submits structured response",
        active: true,
        template: "Dear {submitter_name},\n\nThe department has submitted a response to your grievance ({ticket_number}).\n\nAction taken: {actionTaken}\nResolution summary: {resolutionSummary}\nProposed closure date: {closeDate}\n\nYou have 7 days to confirm resolution or reopen the grievance. Log in to the OAN Portal to respond.\n\nOAN Ethiopia Grievance Portal",
        lastEdited: "2026-04-15T09:30:00Z",
    },
    {
        id: "EC-009",
        title: "Confirmation Window Open",
        subject: "Action Required — Confirm Resolution of Grievance {ticket_number}",
        recipients: ["Submitter"],
        channel: ["SMS"],
        trigger: "Response submitted",
        active: true,
        template: "OAN: Grievance {ticket_number} response received. Reply CONFIRM to close or REOPEN with reason. You have 7 days. Portal: oan.gov.et/grievances/{ticket_number}",
        lastEdited: "2026-04-15T09:30:00Z",
    },
    {
        id: "EC-010",
        title: "Grievance Confirmed / Resolved",
        subject: "Grievance {ticket_number} Resolved — Thank You",
        recipients: ["Submitter"],
        channel: ["SMS", "Email"],
        trigger: "Submitter confirms satisfaction",
        active: true,
        template: "Dear {submitter_name},\n\nYour grievance ({ticket_number}) has been marked as Resolved.\n\nWe would appreciate your feedback. Please rate your experience (1–5) at: oan.gov.et/rate/{ticket_number}\n\nThank you for using the OAN Ethiopia Grievance Portal.",
        lastEdited: "2026-03-28T11:00:00Z",
    },
    {
        id: "EC-011",
        title: "Grievance Reopened",
        subject: "[OAN] Grievance {ticket_number} Reopened by Submitter",
        recipients: ["L1 Officer"],
        channel: ["Email"],
        trigger: "Submitter reopens grievance",
        active: true,
        template: "Dear {assigned_to},\n\nGrievance {ticket_number} has been reopened by the submitter.\n\nReopen reason: {reopenReason}\n\nPlease review the outstanding concerns and resubmit a structured response.\n\nOAN Ethiopia System",
        lastEdited: "2026-03-28T11:00:00Z",
    },
    {
        id: "EC-012",
        title: "Auto-closed (No Response)",
        subject: "Grievance {ticket_number} Auto-Closed — No Objection Received",
        recipients: ["Submitter"],
        channel: ["SMS", "Email"],
        trigger: "Confirmation window expires",
        active: true,
        template: "Dear {submitter_name},\n\nYour grievance ({ticket_number}) has been automatically closed as no response was received within the 7-day confirmation window.\n\nIf you are not satisfied, you may raise a new grievance referencing ticket {ticket_number}.\n\nOAN Ethiopia Grievance Portal",
        lastEdited: "2026-04-02T08:00:00Z",
    },
    {
        id: "EC-013",
        title: "SLA Reminder — 50%",
        subject: "[Reminder] SLA at 50% — Grievance {ticket_number}",
        recipients: ["L1 Officer"],
        channel: ["Email"],
        trigger: "Scheduled job at 50% SLA elapsed",
        active: true,
        template: "Dear {assigned_to},\n\nThis is a reminder that grievance {ticket_number} is at 50% of its SLA deadline.\n\nSubmitter: {submitter_name}\nCategory: {service_category}\nSLA Deadline: {sla_due_date} ({daysRemaining} days remaining)\n\nPlease take action promptly.\n\nOAN Ethiopia System",
        lastEdited: "2026-04-15T09:30:00Z",
    },
    {
        id: "EC-014",
        title: "SLA Reminder — 80%",
        subject: "[URGENT] SLA at 80% — Grievance {ticket_number}",
        recipients: ["L1 Officer"],
        channel: ["Email"],
        trigger: "Scheduled job at 80% SLA elapsed",
        active: true,
        template: "Dear {assigned_to},\n\nURGENT: Grievance {ticket_number} has consumed 80% of its SLA. Immediate action is required.\n\nSLA Deadline: {sla_due_date} ({daysRemaining} days remaining)\n\nOAN Ethiopia System",
        lastEdited: "2026-04-15T09:30:00Z",
    },
    {
        id: "EC-015",
        title: "SLA At-Risk Report (Nodal Officer)",
        subject: "SLA At-Risk Digest — {count} Tickets Near Deadline",
        recipients: ["Nodal Officer"],
        channel: ["Email"],
        trigger: "Scheduled job at 80% SLA elapsed",
        active: true,
        template: "Dear {assigned_to},\n\nThe following grievances are approaching their SLA deadline and have reached 80% elapsed time:\n\n{ticketList}\n\nPlease review and intervene where necessary.\n\nOAN Ethiopia System",
        lastEdited: "2026-04-15T09:30:00Z",
    },
    {
        id: "EC-016",
        title: "SLA Breached — L1 Escalation",
        subject: "[ESCALATED] SLA Breached — Grievance {ticket_number}",
        recipients: ["Dept Head", "Nodal Officer"],
        channel: ["Email"],
        trigger: "SLA deadline passed",
        active: true,
        template: "ESCALATION NOTICE\n\nGrievance {ticket_number} has exceeded its SLA deadline of {sla_days} days.\n\nDays overdue: {daysOverdue}\nSubmitter: {submitter_name}\nCategory: {service_category} — {grievance_type}\nAssigned officer: {assigned_to}\n\nImmediate action is required. This escalation has been logged in the audit trail.\n\nOAN Ethiopia System",
        lastEdited: "2026-04-10T14:00:00Z",
    },
    {
        id: "EC-017",
        title: "SLA Breached — L2 Escalation",
        subject: "[L2 ESCALATION] 2× SLA Breached — Grievance {ticket_number}",
        recipients: ["L2 Officer"],
        channel: ["Email"],
        trigger: "2× SLA deadline passed",
        active: true,
        template: "SECOND-LEVEL ESCALATION\n\nGrievance {ticket_number} has exceeded twice its SLA deadline.\n\nDays overdue: {daysOverdue}\nCategory: {service_category}\nFull history available on OAN Portal.\n\nAll prior stakeholders remain notified. Your intervention is required.\n\nOAN Ethiopia System",
        lastEdited: "2026-04-10T14:00:00Z",
    },
    {
        id: "EC-018",
        title: "Manual Escalation by Submitter",
        subject: "[MANUAL ESCALATION] Grievance {ticket_number} Escalated by Submitter",
        recipients: ["Dept Head", "Nodal Officer"],
        channel: ["Email"],
        trigger: "Submitter triggers escalation via portal",
        active: true,
        template: "MANUAL ESCALATION\n\nSubmitter {submitter_name} has manually escalated grievance {ticket_number} after SLA elapsed.\n\nReason provided: {escalationReason}\nDays overdue: {daysOverdue}\n\nThis triggers the same notifications as an SLA breach escalation.\n\nOAN Ethiopia System",
        lastEdited: "2026-04-10T14:00:00Z",
    },
    {
        id: "EC-019",
        title: "Reassignment Requested",
        subject: "[OAN] Reassignment Requested — Grievance {ticket_number}",
        recipients: ["Nodal Officer"],
        channel: ["Email"],
        trigger: "Officer requests reassignment",
        active: true,
        template: "Dear {assigned_to},\n\nOfficer {assigned_to} ({assigned_dept}) has requested reassignment of grievance {ticket_number}.\n\nReason: {reassignReason}\n\nPlease review and assign to the appropriate department.\n\nOAN Ethiopia System",
        lastEdited: "2026-04-05T10:30:00Z",
    },


];

export const MOCK_ESCALATION_NOTIFICATIONS: NotificationConfig[] = [];
