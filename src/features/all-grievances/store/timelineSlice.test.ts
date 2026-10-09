import { describe, expect, it } from 'vitest';
import {
  attachmentScanVerdictReceived,
  clearTimeline,
  setSelectedTicketNumber,
  timelineReducer,
  type TimelineState,
  selectTimelineEntries,
  selectTimelineSummary,
  selectTimelineSubmitter,
  selectTimelineSLA,
  selectTimelineAssignment,
} from './timelineSlice';
import type { RootState } from '@/store';
import type { GrievanceTimelineData } from '../types';

describe('timelineSlice', () => {
  const initialTimelineState: TimelineState = {
    selectedTicketNumber: null,
    timelineData: null,
    status: 'idle',
    error: null,
    isSubmitting: false,
    submitError: null,
  };

  const sampleTimelineData: GrievanceTimelineData = {
    ticket_number: 'ET14IN000012026',
    ticket_number_display: 'ET14IN000012026',
    status: 'In Progress',
    escalated: false,
    summary: {
      description: '50kg certified maize seeds failed germination.',
      service_category: 'Inputs',
      grievance_type: 'Seed Quality',
    },
    submitter: {
      name: 'Abebe Bekele',
      contact_mobile: '+251911223344',
      submitter_type: 'Individual Farmer',
      is_anonymous: false,
    },
    sla: {
      sla_days: 14,
      sla_consumed_percent: 65,
      sla_due_date: '2026-05-10T17:00:00Z',
    },
    assignment: {
      department: 'Inputs Supply & Distribution Agency',
      assigned_to: 'Tigist Alemu',
      routed_automatically: true,
    },
    timeline: [
      {
        name: 'GR-TIME-000001',
        entry_type: 'note',
        is_internal: true,
        body: 'Sample lab sent.',
        created_on: '2026-04-10T14:53:00Z',
      },
    ],
  };

  it('sets the selected ticket number and resets data if set to null', () => {
    let state = timelineReducer(initialTimelineState, setSelectedTicketNumber('ET14IN000012026'));
    expect(state.selectedTicketNumber).toBe('ET14IN000012026');

    state = {
      ...state,
      timelineData: sampleTimelineData,
      status: 'succeeded',
    };

    state = timelineReducer(state, setSelectedTicketNumber(null));
    expect(state.selectedTicketNumber).toBe(null);
    expect(state.timelineData).toBe(null);
    expect(state.status).toBe('idle');
  });

  it('clears all timeline state on clearTimeline', () => {
    const dirtyState: TimelineState = {
      selectedTicketNumber: 'ET14IN000012026',
      timelineData: sampleTimelineData,
      status: 'succeeded',
      error: 'Some error',
      isSubmitting: true,
      submitError: 'Submit failed',
    };

    const cleared = timelineReducer(dirtyState, clearTimeline());
    expect(cleared.selectedTicketNumber).toBe(null);
    expect(cleared.timelineData).toBe(null);
    expect(cleared.status).toBe('idle');
    expect(cleared.error).toBe(null);
    expect(cleared.isSubmitting).toBe(false);
    expect(cleared.submitError).toBe(null);
  });

  it('selects timeline sub-objects cleanly with memoized selectors', () => {
    const mockRootState = {
      timeline: {
        selectedTicketNumber: 'ET14IN000012026',
        timelineData: sampleTimelineData,
        status: 'succeeded' as const,
        error: null,
        isSubmitting: false,
        submitError: null,
      },
    } as RootState;

    expect(selectTimelineEntries(mockRootState)).toEqual(sampleTimelineData.timeline);
    expect(selectTimelineSummary(mockRootState)).toEqual(sampleTimelineData.summary);
    expect(selectTimelineSubmitter(mockRootState)).toEqual(sampleTimelineData.submitter);
    expect(selectTimelineSLA(mockRootState)).toEqual(sampleTimelineData.sla);
    expect(selectTimelineAssignment(mockRootState)).toEqual(sampleTimelineData.assignment);
  });

  it('updates current_state and appends timeline_event on executeTimelineActionThunk.fulfilled', () => {
    const currentState: TimelineState = {
      selectedTicketNumber: 'ET14IN000012026',
      timelineData: { ...sampleTimelineData },
      status: 'succeeded',
      error: null,
      isSubmitting: true,
      submitError: null,
    };

    const actionResult = {
      ticket_number: 'ET14IN000012026',
      status: 'Closed',
      action: 'Confirm Resolution',
      current_state: {
        status: 'Closed',
        escalated: false,
        assigned_to: 'Tigist Alemu',
        department: 'Inputs Supply & Distribution Agency',
        available_actions: [],
      },
      timeline_event: {
        id: 'GR-TIME-000002',
        entry_type: 'resolution',
        is_internal: false,
        body: 'Resolution confirmed by submitter',
        created_on: '2026-04-11T10:00:00Z',
      },
    };

    const nextState = timelineReducer(currentState, {
      type: 'timeline/executeAction/fulfilled',
      payload: actionResult,
      meta: { arg: { ticketNumber: 'ET14IN000012026' } },
    });

    expect(nextState.isSubmitting).toBe(false);
    expect(nextState.timelineData?.status).toBe('Closed');
    expect(nextState.timelineData?.timeline?.length).toBe(2);
    expect(nextState.timelineData?.timeline?.[1]?.body).toBe('Resolution confirmed by submitter');
  });

  it('updates sla_due_date and appends timeline_event on deferSLAGrievanceThunk.fulfilled', () => {
    const currentState: TimelineState = {
      selectedTicketNumber: 'ET14IN000012026',
      timelineData: { ...sampleTimelineData },
      status: 'succeeded',
      error: null,
      isSubmitting: true,
      submitError: null,
    };

    const deferResult = {
      ticket_number: 'ET14IN000012026',
      status: 'In Progress',
      sla_due_date: '2026-05-17T17:00:00Z',
      change_request: {
        name: 'CR-0001',
        ticket_number: 'ET14IN000012026',
        subject: 'Defer SLA by 7 days',
        status: 'Pending',
        requested_by: 'officer@example.com',
        changes: [{ fieldname: 'sla_due_date', new_value: '2026-05-17T17:00:00Z' }],
        trail: [],
      },
      current_state: {
        status: 'In Progress',
        escalated: false,
      },
      timeline_event: {
        id: 'GR-TIME-000003',
        entry_type: 'deferral',
        is_internal: true,
        body: 'SLA deferral requested for 7 days',
        created_on: '2026-04-11T12:00:00Z',
      },
    };

    const nextState = timelineReducer(currentState, {
      type: 'timeline/deferSLA/fulfilled',
      payload: deferResult,
      meta: { arg: { ticketNumber: 'ET14IN000012026' } },
    });

    expect(nextState.isSubmitting).toBe(false);
    expect(nextState.timelineData?.sla?.sla_due_date).toBe('2026-05-17T17:00:00Z');
    expect(nextState.timelineData?.timeline?.length).toBe(2);
    expect(nextState.timelineData?.timeline?.[1]?.body).toBe('SLA deferral requested for 7 days');
  });

  it('updates department/assignee and appends timeline_event on reassignGrievanceThunk.fulfilled', () => {
    const currentState: TimelineState = {
      selectedTicketNumber: 'ET14IN000012026',
      timelineData: { ...sampleTimelineData },
      status: 'succeeded',
      error: null,
      isSubmitting: true,
      submitError: null,
    };

    const reassignResult = {
      ticket_number: 'ET14IN000012026',
      status: 'Assigned',
      assigned_dept: 'Credit & Financial Services',
      assigned_to: 'Abebe Bekele',
      change_request: {
        name: 'CR-0002',
        ticket_number: 'ET14IN000012026',
        subject: 'Reassign to Credit & Financial Services',
        status: 'Pending',
        requested_by: 'officer@example.com',
        changes: [{ fieldname: 'assigned_dept', new_value: 'Credit & Financial Services' }],
        trail: [],
      },
      current_state: {
        status: 'Assigned',
        escalated: false,
        department: 'Credit & Financial Services',
        assigned_to: 'Abebe Bekele',
      },
      timeline_event: {
        id: 'GR-TIME-000004',
        entry_type: 'reassignment',
        is_internal: true,
        body: 'Reassignment requested to Credit & Financial Services',
        created_on: '2026-04-11T13:00:00Z',
      },
    };

    const nextState = timelineReducer(currentState, {
      type: 'timeline/reassign/fulfilled',
      payload: reassignResult,
      meta: { arg: { ticketNumber: 'ET14IN000012026' } },
    });

    expect(nextState.isSubmitting).toBe(false);
    expect(nextState.timelineData?.assignment?.department).toBe('Credit & Financial Services');
    expect(nextState.timelineData?.assignment?.assigned_to).toBe('Abebe Bekele');
    expect(nextState.timelineData?.timeline?.length).toBe(2);
  });

  it('ignores a late timeline response for a ticket that is no longer selected', () => {
    const onTicketB: TimelineState = {
      ...initialTimelineState,
      selectedTicketNumber: 'TICKET-B',
      status: 'loading',
    };

    const lateFulfilled = timelineReducer(onTicketB, {
      type: 'timeline/fetchTimeline/fulfilled',
      payload: { ...sampleTimelineData, ticket_number: 'TICKET-A' },
      meta: { arg: { ticketNumber: 'TICKET-A' } },
    });
    expect(lateFulfilled.timelineData).toBeNull();
    expect(lateFulfilled.status).toBe('loading');

    const lateRejected = timelineReducer(onTicketB, {
      type: 'timeline/fetchTimeline/rejected',
      payload: 'boom',
      meta: { arg: { ticketNumber: 'TICKET-A' } },
    });
    expect(lateRejected.status).toBe('loading');
    expect(lateRejected.error).toBeNull();
  });

  it('ignores a late mutation response for a ticket that is no longer selected', () => {
    const onTicketB: TimelineState = {
      ...initialTimelineState,
      selectedTicketNumber: 'TICKET-B',
      timelineData: { ...sampleTimelineData, status: 'In Progress' },
      status: 'succeeded',
      isSubmitting: true,
    };

    const next = timelineReducer(onTicketB, {
      type: 'timeline/reassign/fulfilled',
      payload: { ticket_number: 'TICKET-A', current_state: { status: 'Closed', escalated: false } },
      meta: { arg: { ticketNumber: 'TICKET-A' } },
    });
    expect(next.timelineData?.status).toBe('In Progress');
    expect(next.isSubmitting).toBe(false);
  });

  it('applies a realtime scan verdict to the attachment everywhere it is listed', () => {
    const attachment = { name: 'GA-2026-00042', attachment: 'GA-2026-00042', scan_status: 'Pending' };
    const withPending: TimelineState = {
      ...initialTimelineState,
      selectedTicketNumber: 'ET14IN000012026',
      status: 'succeeded',
      timelineData: {
        ...sampleTimelineData,
        attachments: [{ ...attachment }, { name: 'GA-OTHER', scan_status: 'Pending' }],
        timeline: [{ ...sampleTimelineData.timeline![0]!, attachments: [{ ...attachment }] }],
      },
    };

    const next = timelineReducer(
      withPending,
      attachmentScanVerdictReceived({ attachment: 'GA-2026-00042', grievance: 'GRV-1', scan_status: 'Clean' })
    );
    expect(next.timelineData?.attachments?.[0]?.scan_status).toBe('Clean');
    expect(next.timelineData?.attachments?.[1]?.scan_status).toBe('Pending');
    expect(next.timelineData?.timeline?.[0]?.attachments?.[0]?.scan_status).toBe('Clean');
  });

  it('keeps the current view during a silent background refetch', () => {
    const loaded: TimelineState = {
      ...initialTimelineState,
      selectedTicketNumber: 'ET14IN000012026',
      timelineData: sampleTimelineData,
      status: 'succeeded',
    };
    const meta = { arg: { ticketNumber: 'ET14IN000012026', silent: true } };

    const pending = timelineReducer(loaded, { type: 'timeline/fetchTimeline/pending', meta });
    expect(pending.status).toBe('succeeded');

    const failed = timelineReducer(pending, {
      type: 'timeline/fetchTimeline/rejected',
      payload: 'Network down',
      meta,
    });
    expect(failed.status).toBe('succeeded');
    expect(failed.error).toBeNull();
    expect(failed.timelineData).toBe(sampleTimelineData);
  });
});
