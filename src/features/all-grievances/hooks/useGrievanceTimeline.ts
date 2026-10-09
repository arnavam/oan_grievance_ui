"use client";

import { useCallback, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { subscribeGrievance, useRealtimeEvent } from '@/lib/realtime';
import {
  fetchTimelineThunk,
  postTimelineMessageThunk,
  addTimelineNoteThunk,
  executeTimelineActionThunk,
  deferSLAGrievanceThunk,
  reassignGrievanceThunk,
  setSelectedTicketNumber,
  attachmentScanVerdictReceived,
  selectTimelineData,
  selectTimelineLoading,
  selectTimelineIsSubmitting,
  selectTimelineError,
} from '../store/timelineSlice';
import type { DeferSLAPayload, GrievanceActionPayload, ReassignGrievancePayload } from '../types';

interface UseGrievanceTimelineOptions {
  ticketNumber: string | null | undefined;
}

export function useGrievanceTimeline({ ticketNumber }: UseGrievanceTimelineOptions) {
  const dispatch = useAppDispatch();
  const timelineData = useAppSelector(selectTimelineData);
  const isLoading = useAppSelector(selectTimelineLoading);
  const isSubmitting = useAppSelector(selectTimelineIsSubmitting);
  const error = useAppSelector(selectTimelineError);

  useEffect(() => {
    if (!ticketNumber) {
      dispatch(setSelectedTicketNumber(null));
      return;
    }

    dispatch(setSelectedTicketNumber(ticketNumber));
    void dispatch(fetchTimelineThunk({ ticketNumber }));
  }, [ticketNumber, dispatch]);

  // Realtime events name the grievance by its id (document name), which the
  // timeline response carries; the ticket number alone can't join the room.
  // The slice only keeps the selected ticket's timeline, so this is never a
  // previous ticket's id.
  const grievanceId = timelineData?.name;

  useEffect(() => {
    if (!grievanceId) return;
    return subscribeGrievance(grievanceId);
  }, [grievanceId]);

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  const refreshSilently = useCallback(() => {
    if (!ticketNumber) return;
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      void dispatch(fetchTimelineThunk({ ticketNumber, silent: true }));
    }, 400);
  }, [ticketNumber, dispatch]);

  useRealtimeEvent('attachment_scanned', (event) => {
    if (!grievanceId || event.grievance !== grievanceId) return;
    dispatch(attachmentScanVerdictReceived(event));
    refreshSilently();
  });
  useRealtimeEvent('timeline_updated', (event) => {
    if (!grievanceId || (event.grievance !== grievanceId && event.ticket_number !== ticketNumber)) return;
    refreshSilently();
  });
  // A notification may be about this case, and a resync means events may
  // have been missed; either way the open case is re-read through REST.
  useRealtimeEvent('notification', refreshSilently);
  useRealtimeEvent('resync', refreshSilently);

  const refetch = useCallback(() => {
    if (ticketNumber) {
      void dispatch(fetchTimelineThunk({ ticketNumber }));
    }
  }, [ticketNumber, dispatch]);

  const postMessage = useCallback(
    async (body: string) => {
      if (!ticketNumber) return;
      return dispatch(postTimelineMessageThunk({ ticketNumber, body })).unwrap();
    },
    [ticketNumber, dispatch]
  );

  const addNote = useCallback(
    async (body: string, isInternal = true) => {
      if (!ticketNumber) return;
      return dispatch(addTimelineNoteThunk({ ticketNumber, body, isInternal })).unwrap();
    },
    [ticketNumber, dispatch]
  );

  const executeAction = useCallback(
    async (payload: GrievanceActionPayload) => {
      if (!ticketNumber) return;
      return dispatch(executeTimelineActionThunk({ ticketNumber, payload })).unwrap();
    },
    [ticketNumber, dispatch]
  );

  const deferSLA = useCallback(
    async (payload: DeferSLAPayload) => {
      if (!ticketNumber) return;
      return dispatch(deferSLAGrievanceThunk({ ticketNumber, payload })).unwrap();
    },
    [ticketNumber, dispatch]
  );

  const reassign = useCallback(
    async (payload: ReassignGrievancePayload) => {
      if (!ticketNumber) return;
      return dispatch(reassignGrievanceThunk({ ticketNumber, payload })).unwrap();
    },
    [ticketNumber, dispatch]
  );

  return {
    timelineData,
    isLoading,
    isSubmitting,
    error,
    refetch,
    postMessage,
    addNote,
    executeAction,
    deferSLA,
    reassign,
  };
}
