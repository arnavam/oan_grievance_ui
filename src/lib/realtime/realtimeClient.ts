import { io, type Socket } from 'socket.io-client';
import { logger } from '@/lib/logger';

/**
 * Browser client for the grievance service's realtime API
 * (oan_grievance_service/openapi/asyncapi_v1.yaml).
 *
 * Events are signals, not data: each carries ids and a status, and a listener
 * refetches through REST, which applies permissions. A socket can drop at any
 * time and missed events are never replayed, so this module also raises a
 * local `resync` event on every reconnect and whenever the tab regains focus;
 * a screen showing server state refetches on it.
 *
 * Browser-only, one socket per tab. The module-level state below is safe
 * because nothing here ever runs on the server: `connectRealtime` is only
 * called from an effect.
 */

export type AttachmentScanVerdict = 'Clean' | 'Infected' | 'Failed';

export interface AttachmentScannedEvent {
  attachment: string;
  grievance: string;
  scan_status: AttachmentScanVerdict;
}

export interface RealtimeEventMap {
  /** An attachment the caller uploaded, or one on a subscribed grievance, has a scan verdict. */
  attachment_scanned: AttachmentScannedEvent;
  /** A timeline event (message, note, action) was recorded on a grievance. */
  timeline_updated: { grievance: string; ticket_number?: string };
  /** A new in-app notification exists for the caller. Carries no payload. */
  notification: undefined;
  /** Local: the socket reconnected or the tab regained focus, so events may have been missed. */
  resync: undefined;
}

export type RealtimeEventName = keyof RealtimeEventMap;
type Listener<K extends RealtimeEventName> = (payload: RealtimeEventMap[K]) => void;

interface RealtimeConnection {
  url: string;
  site: string;
  path: string;
}

const SCAN_VERDICTS: readonly string[] = ['Clean', 'Infected', 'Failed'];
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

const listeners: { [K in RealtimeEventName]: Set<Listener<K>> } = {
  attachment_scanned: new Set(),
  timeline_updated: new Set(),
  notification: new Set(),
  resync: new Set(),
};

/** Grievance rooms this tab wants, ref-counted so two views of one grievance share a subscription. */
const grievanceRooms = new Map<string, number>();

let socket: Socket | null = null;
let active = false;
let connecting = false;
let reconnectAttempt = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let hasConnectedOnce = false;

function emitLocal<K extends RealtimeEventName>(event: K, payload: RealtimeEventMap[K]) {
  for (const listener of listeners[event]) {
    try {
      listener(payload);
    } catch (error) {
      logger.error(`Realtime listener for "${event}" threw:`, error);
    }
  }
}

/** Parses the wire payload instead of trusting it: the socket is a trust boundary like any request body. */
function parseAttachmentScanned(raw: unknown): AttachmentScannedEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const { attachment, grievance, scan_status } = raw as Record<string, unknown>;
  if (typeof attachment !== 'string' || typeof grievance !== 'string') return null;
  if (typeof scan_status !== 'string' || !SCAN_VERDICTS.includes(scan_status)) return null;
  return { attachment, grievance, scan_status: scan_status as AttachmentScanVerdict };
}

async function fetchConnection(): Promise<RealtimeConnection | null> {
  const response = await fetch('/api/realtime/config', { method: 'POST', credentials: 'same-origin' });
  if (!response.ok) return null;
  const data = (await response.json()) as Partial<RealtimeConnection> & { enabled?: boolean };
  if (!data.enabled || !data.url || !data.site || !data.path) return null;
  return { url: data.url, site: data.site, path: data.path };
}

function scheduleReconnect() {
  if (!active || reconnectTimer) return;
  const delay = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempt, RECONNECT_MAX_MS);
  reconnectAttempt += 1;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void openSocket();
  }, delay);
}

function teardownSocket() {
  if (!socket) return;
  socket.removeAllListeners();
  socket.io.removeAllListeners();
  socket.disconnect();
  socket = null;
}

/**
 * Opens a fresh socket connecting to the portal gateway. The gateway reads
 * the httpOnly cookie and passes it upstream.
 */
async function openSocket() {
  if (!active || connecting) return;
  connecting = true;
  try {
    const connection = await fetchConnection();
    if (!active) return;
    if (!connection) {
      // Realtime disabled, or no session. Neither improves by retrying soon,
      // and a signed-out tab is torn down by `disconnectRealtime` anyway.
      return;
    }

    teardownSocket();
    const next = io(`${connection.url}/${connection.site}`, {
      path: connection.path,
      extraHeaders: { 'x-frappe-site-name': connection.site },
      reconnection: false,
      withCredentials: true,
      transports: ['websocket'],
    });
    socket = next;

    next.on('connect', () => {
      reconnectAttempt = 0;
      for (const grievance of grievanceRooms.keys()) {
        next.emit('doc_subscribe', 'Grievance', grievance);
      }
      if (hasConnectedOnce) emitLocal('resync', undefined);
      hasConnectedOnce = true;
    });
    next.on('connect_error', (error) => {
      logger.error('Realtime connection failed:', error.message);
      scheduleReconnect();
    });
    next.on('disconnect', (reason) => {
      if (reason !== 'io client disconnect') scheduleReconnect();
    });
    next.on('attachment_scanned', (raw: unknown) => {
      const event = parseAttachmentScanned(raw);
      if (event) emitLocal('attachment_scanned', event);
    });
    next.on('notification', () => emitLocal('notification', undefined));
    next.on('timeline_updated', (raw: unknown) => {
      if (raw && typeof raw === 'object' && 'grievance' in raw) {
        emitLocal('timeline_updated', raw as { grievance: string; ticket_number?: string });
      }
    });
  } catch (error) {
    logger.error('Realtime token request failed:', error);
    scheduleReconnect();
  } finally {
    connecting = false;
  }
}

function handleFocus() {
  if (document.visibilityState === 'visible') emitLocal('resync', undefined);
}

/** Starts the socket for the signed-in session. Idempotent. */
export function connectRealtime() {
  if (active || typeof window === 'undefined') return;
  active = true;
  hasConnectedOnce = false;
  reconnectAttempt = 0;
  document.addEventListener('visibilitychange', handleFocus);
  window.addEventListener('focus', handleFocus);
  void openSocket();
}

/** Closes the socket, e.g. on sign-out. Room subscriptions are kept for the next connect. */
export function disconnectRealtime() {
  if (!active) return;
  active = false;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  document.removeEventListener('visibilitychange', handleFocus);
  window.removeEventListener('focus', handleFocus);
  teardownSocket();
}

export function onRealtimeEvent<K extends RealtimeEventName>(event: K, listener: Listener<K>): () => void {
  listeners[event].add(listener);
  return () => {
    listeners[event].delete(listener);
  };
}

/**
 * Joins `doc:Grievance/<id>` while a grievance is on screen. The server joins
 * the socket only if the user can read the grievance. Returns the leave call.
 */
export function subscribeGrievance(grievance: string): () => void {
  const count = grievanceRooms.get(grievance) ?? 0;
  grievanceRooms.set(grievance, count + 1);
  if (count === 0 && socket?.connected) socket.emit('doc_subscribe', 'Grievance', grievance);

  let left = false;
  return () => {
    if (left) return;
    left = true;
    const remaining = (grievanceRooms.get(grievance) ?? 1) - 1;
    if (remaining > 0) {
      grievanceRooms.set(grievance, remaining);
      return;
    }
    grievanceRooms.delete(grievance);
    if (socket?.connected) socket.emit('doc_unsubscribe', 'Grievance', grievance);
  };
}
