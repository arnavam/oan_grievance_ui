import { createAsyncThunk, createSelector, createSlice, isAnyOf, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/store';
import type { AttachmentScannedEvent } from '@/lib/realtime';
import {
  fetchGrievanceTimeline,
  postGrievanceMessage,
  addGrievanceNote,
  executeGrievanceAction,
  deferGrievanceSLA,
  reassignGrievance,
} from '../api/grievanceApi';
import type {
  DeferSLAPayload,
  GrievanceActionPayload,
  GrievanceActionResult,
  GrievanceChangeResponseData,
  GrievanceCurrentState,
  GrievanceTimelineAttachment,
  GrievanceTimelineData,
  GrievanceTimelineQueryParams,
  ReassignGrievancePayload,
  TimelineEntry,
  TimelineEventItem,
} from '../types';


export interface TimelineState {
  selectedTicketNumber: string | null;
  timelineData: GrievanceTimelineData | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  isSubmitting: boolean;
  submitError: string | null;
}

const initialState: TimelineState = {
  selectedTicketNumber: null,
  timelineData: null,
  status: 'idle',
  error: null,
  isSubmitting: false,
  submitError: null,
};

/**
 * Shared by every mutation thunk's fulfilled case: folds the response's
 * `current_state` into the cached timeline. Assignment is only touched when
 * the response actually carries it.
 */
function mergeCurrentState(data: GrievanceTimelineData, cs: GrievanceCurrentState) {
  data.status = cs.status;
  data.current_status = cs.status;
  data.escalated = Boolean(cs.escalated);
  if (cs.available_actions) data.available_actions = cs.available_actions;
  if (data.assignment) {
    if (cs.assigned_to !== undefined) data.assignment.assigned_to = cs.assigned_to;
    if (cs.department !== undefined) data.assignment.department = cs.department;
  }
}

/** Appends a mutation's timeline event unless the cached timeline already has it (by id, falling back to name). */
/**
 * A response is only applied while its ticket is still the one on screen.
 * Officers switch tickets faster than responses land (and every mutation fires
 * a follow-up refetch), so without this a late response for ticket A would
 * overwrite ticket B's timeline, status and attachments.
 */
function isForSelectedTicket(state: TimelineState, ticketNumber: string) {
  return state.selectedTicketNumber === ticketNumber;
}

function appendTimelineEvent(data: GrievanceTimelineData, event: TimelineEntry) {
  const list = data.timeline || [];
  const eventId = event.id || event.name;
  const exists = list.some((e) => (e.id && e.id === eventId) || (e.name && e.name === eventId));
  if (!exists) data.timeline = [...list, event];
}

export const fetchTimelineThunk = createAsyncThunk<
  GrievanceTimelineData,
  {
    ticketNumber: string;
    params?: GrievanceTimelineQueryParams;
    /** A background refresh (realtime signal, tab focus): keeps the current view instead of showing a loading state. */
    silent?: boolean;
  },
  { rejectValue: string }
>('timeline/fetchTimeline', async ({ ticketNumber, params }, { rejectWithValue }) => {
  try {
    return await fetchGrievanceTimeline(ticketNumber, params);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to load timeline';
    return rejectWithValue(msg);
  }
});

export const postTimelineMessageThunk = createAsyncThunk<
  GrievanceActionResult,
  { ticketNumber: string; body: string },
  { rejectValue: string }
>('timeline/postMessage', async ({ ticketNumber, body }, { dispatch, rejectWithValue }) => {
  try {
    const result = await postGrievanceMessage(ticketNumber, body);
    void dispatch(fetchTimelineThunk({ ticketNumber }));
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to post message';
    return rejectWithValue(msg);
  }
});

export const addTimelineNoteThunk = createAsyncThunk<
  GrievanceActionResult,
  { ticketNumber: string; body: string; isInternal?: boolean },
  { rejectValue: string }
>('timeline/addNote', async ({ ticketNumber, body, isInternal = true }, { dispatch, rejectWithValue }) => {
  try {
    const result = await addGrievanceNote(ticketNumber, body, isInternal);
    void dispatch(fetchTimelineThunk({ ticketNumber }));
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to add note';
    return rejectWithValue(msg);
  }
});

export const executeTimelineActionThunk = createAsyncThunk<
  GrievanceActionResult,
  { ticketNumber: string; payload: GrievanceActionPayload },
  { rejectValue: string }
>('timeline/executeAction', async ({ ticketNumber, payload }, { dispatch, rejectWithValue }) => {
  try {
    const result = await executeGrievanceAction(ticketNumber, payload);
    void dispatch(fetchTimelineThunk({ ticketNumber }));
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to execute action';
    return rejectWithValue(msg);
  }
});

export const deferSLAGrievanceThunk = createAsyncThunk<
  GrievanceChangeResponseData,
  { ticketNumber: string; payload: DeferSLAPayload },
  { rejectValue: string }
>('timeline/deferSLA', async ({ ticketNumber, payload }, { dispatch, rejectWithValue }) => {
  try {
    const result = await deferGrievanceSLA(ticketNumber, payload);
    void dispatch(fetchTimelineThunk({ ticketNumber }));
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to request SLA deferral';
    return rejectWithValue(msg);
  }
});

export const reassignGrievanceThunk = createAsyncThunk<
  GrievanceChangeResponseData,
  { ticketNumber: string; payload: ReassignGrievancePayload },
  { rejectValue: string }
>('timeline/reassign', async ({ ticketNumber, payload }, { dispatch, rejectWithValue }) => {
  try {
    const result = await reassignGrievance(ticketNumber, payload);
    void dispatch(fetchTimelineThunk({ ticketNumber }));
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to reassign grievance';
    return rejectWithValue(msg);
  }
});


export const timelineSlice = createSlice({
  name: 'timeline',
  initialState,
  reducers: {
    setSelectedTicketNumber(state, action: PayloadAction<string | null>) {
      state.selectedTicketNumber = action.payload;
      if (!action.payload) {
        state.timelineData = null;
        state.status = 'idle';
        state.error = null;
      }
    },
    /**
     * Applies a realtime scan verdict to the attachment wherever the cached
     * timeline lists it, so a Clean file becomes viewable without waiting for
     * the follow-up refetch.
     */
    attachmentScanVerdictReceived(state, action: PayloadAction<AttachmentScannedEvent>) {
      const data = state.timelineData;
      if (!data) return;
      const { attachment, scan_status } = action.payload;
      const matches = (a: GrievanceTimelineAttachment) =>
        a.attachment === attachment || a.name === attachment || a.id === attachment;
      for (const a of data.attachments ?? []) {
        if (matches(a)) a.scan_status = scan_status;
      }
      for (const entry of data.timeline ?? []) {
        for (const a of entry.attachments ?? []) {
          if (matches(a)) a.scan_status = scan_status;
        }
      }
    },
    clearTimeline(state) {
      state.selectedTicketNumber = null;
      state.timelineData = null;
      state.status = 'idle';
      state.error = null;
      state.isSubmitting = false;
      state.submitError = null;
    },
  },
  extraReducers: (builder) => {
    // fetchTimelineThunk
    builder
      .addCase(fetchTimelineThunk.pending, (state, action) => {
        if (action.meta.arg.silent && state.timelineData) return;
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchTimelineThunk.fulfilled, (state, action) => {
        if (!isForSelectedTicket(state, action.meta.arg.ticketNumber)) return;
        state.status = 'succeeded';
        state.timelineData = action.payload;
        state.error = null;
      })
      .addCase(fetchTimelineThunk.rejected, (state, action) => {
        if (!isForSelectedTicket(state, action.meta.arg.ticketNumber)) return;
        // A failed background refresh leaves the last good view on screen.
        if (action.meta.arg.silent && state.timelineData) return;
        state.status = 'failed';
        state.error = action.payload ?? 'Failed to fetch timeline';
      });

    // Specific mutation payload handlers
    builder
      .addCase(executeTimelineActionThunk.fulfilled, (state, action) => {
        const result = action.payload;
        if (state.timelineData && isForSelectedTicket(state, action.meta.arg.ticketNumber)) {
          if (result.current_state) {
            mergeCurrentState(state.timelineData, result.current_state);
          } else if (result.status) {
            state.timelineData.status = result.status;
            state.timelineData.current_status = result.status;
            if (result.available_actions) {
              state.timelineData.available_actions = result.available_actions;
            }
          }

          if (result.timeline_event) appendTimelineEvent(state.timelineData, result.timeline_event);
        }
      })
      .addCase(deferSLAGrievanceThunk.fulfilled, (state, action) => {
        const result = action.payload;
        if (state.timelineData && isForSelectedTicket(state, action.meta.arg.ticketNumber)) {
          if (result.sla_due_date && state.timelineData.sla) {
            state.timelineData.sla.sla_due_date = result.sla_due_date;
          }
          if (result.current_state) mergeCurrentState(state.timelineData, result.current_state);
          if (result.timeline_event) appendTimelineEvent(state.timelineData, result.timeline_event);
        }
      })
      .addCase(reassignGrievanceThunk.fulfilled, (state, action) => {
        const result = action.payload;
        if (state.timelineData && isForSelectedTicket(state, action.meta.arg.ticketNumber)) {
          if (state.timelineData.assignment) {
            if (result.assigned_dept) {
              state.timelineData.assignment.department = result.assigned_dept;
            }
            if (result.assigned_to !== undefined) {
              state.timelineData.assignment.assigned_to = result.assigned_to;
            }
          }
          if (result.current_state) mergeCurrentState(state.timelineData, result.current_state);
          if (result.timeline_event) appendTimelineEvent(state.timelineData, result.timeline_event);
        }
      });

    // Shared lifecycle matchers for timeline mutations
    builder
      .addMatcher(
        isAnyOf(
          postTimelineMessageThunk.pending,
          addTimelineNoteThunk.pending,
          executeTimelineActionThunk.pending,
          deferSLAGrievanceThunk.pending,
          reassignGrievanceThunk.pending
        ),
        (state) => {
          state.isSubmitting = true;
          state.submitError = null;
        }
      )
      .addMatcher(
        isAnyOf(
          postTimelineMessageThunk.fulfilled,
          addTimelineNoteThunk.fulfilled,
          executeTimelineActionThunk.fulfilled,
          deferSLAGrievanceThunk.fulfilled,
          reassignGrievanceThunk.fulfilled
        ),
        (state) => {
          state.isSubmitting = false;
          state.submitError = null;
        }
      )
      .addMatcher(
        isAnyOf(
          postTimelineMessageThunk.rejected,
          addTimelineNoteThunk.rejected,
          executeTimelineActionThunk.rejected,
          deferSLAGrievanceThunk.rejected,
          reassignGrievanceThunk.rejected
        ),
        (state, action) => {
          state.isSubmitting = false;
          state.submitError = (action.payload as string | undefined) ?? 'Action failed';
        }
      );
  },
});


export const { setSelectedTicketNumber, attachmentScanVerdictReceived, clearTimeline } = timelineSlice.actions;
export const timelineReducer = timelineSlice.reducer;

// Selectors
export const selectTimelineState = (state: RootState) => state.timeline;
export const selectSelectedTicketNumber = (state: RootState) => state.timeline.selectedTicketNumber;
export const selectTimelineData = (state: RootState) => state.timeline.timelineData;
export const selectTimelineStatus = (state: RootState) => state.timeline.status;
export const selectTimelineLoading = (state: RootState) => state.timeline.status === 'loading';
export const selectTimelineError = (state: RootState) => state.timeline.error;
export const selectTimelineIsSubmitting = (state: RootState) => state.timeline.isSubmitting;
export const selectTimelineSubmitError = (state: RootState) => state.timeline.submitError;

export const selectTimelineEntries = createSelector(
  [selectTimelineData],
  (data): Array<TimelineEntry | TimelineEventItem> => {
    return data?.timeline || data?.events || [];
  }
);

export const selectTimelineSummary = createSelector(
  [selectTimelineData],
  (data) => data?.summary ?? null
);

export const selectTimelineSubmitter = createSelector(
  [selectTimelineData],
  (data) => data?.submitter ?? null
);

export const selectTimelineSLA = createSelector(
  [selectTimelineData],
  (data) => data?.sla ?? null
);

export const selectTimelineAssignment = createSelector(
  [selectTimelineData],
  (data) => data?.assignment ?? null
);
