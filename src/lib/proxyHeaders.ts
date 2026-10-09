import { getClientIp } from '@/lib/clientIp';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

// Header and body sanitization for `/api/proxy/*`, which relays traffic
// between the browser and the Frappe-backed auth service. Both directions are
// allowlisted rather than blocklisted: a blocklist has to enumerate every
// header that must not cross and starts leaking the moment either side adds a
// new one; an allowlist fails closed instead.

// --- Request: browser -> backend ------------------------------------------

/**
 * Client headers that may reach the backend. Everything else is dropped,
 * notably the whole `x-forwarded-*` family — Frappe reads the *leftmost*
 * `X-Forwarded-For` entry for its own rate limiting, so relaying the client's
 * own value would hand it control of the identity that limiter keys on. We
 * re-derive and set it below instead.
 *
 * `cookie` is absent deliberately — the browser's cookies are ours, not the
 * backend's, and the JWT is attached as an `Authorization` header instead.
 */
const FORWARDED_REQUEST_HEADERS: ReadonlySet<string> = new Set([
  'accept',
  'accept-language',
  'content-type',
  'user-agent',
  'x-request-id',
]);

/** `authToken` is injected server-side from the httpOnly cookie; the browser never holds it. */
export function buildUpstreamHeaders(request: Request, authToken?: string): Headers {
  const headers = new Headers();

  request.headers.forEach((value, key) => {
    if (FORWARDED_REQUEST_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  headers.set('X-Forwarded-For', getClientIp(request));

  const url = new URL(request.url);
  headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''));
  headers.set('X-Forwarded-Host', url.host);

  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  return headers;
}

// --- Response: backend -> browser -----------------------------------------

/**
 * Backend headers the browser is allowed to see. Excludes `set-cookie` (a
 * backend-issued cookie must never shadow this app's own httpOnly session
 * cookies) and stack/version disclosure headers.
 */
const FORWARDED_RESPONSE_HEADERS: ReadonlySet<string> = new Set([
  'content-type',
  'cache-control',
  'expires',
  'vary',
  'retry-after',
]);

export function sanitizeResponseHeaders(source: Headers): Headers {
  const headers = new Headers();
  source.forEach((value, key) => {
    if (FORWARDED_RESPONSE_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  return headers;
}

/** Rewrites an upstream `Location` to point back through this proxy, or drops it if off-backend. */
export function rewriteLocation(location: string, proxyPrefix: string): string | null {
  const backend = new URL(env.AUTH_API_BASE_URL);

  let target: URL;
  try {
    target = new URL(location, backend);
  } catch {
    return null;
  }

  if (target.origin !== backend.origin) return null;

  const basePath = backend.pathname.replace(/\/+$/, '');
  const path =
    basePath && target.pathname.startsWith(basePath)
      ? target.pathname.slice(basePath.length)
      : target.pathname;

  return `${proxyPrefix}${path.startsWith('/') ? '' : '/'}${path}${target.search}${target.hash}`;
}

// --- Response body ---------------------------------------------------------

/**
 * Frappe debug fields that must not reach the browser. On an unhandled
 * exception these carry the traceback — exception class, file paths, line
 * numbers, and for a failed query the SQL itself.
 */
const FRAPPE_DEBUG_FIELDS = ['_server_messages', '_debug_messages', 'exc', 'exception', 'traceback'] as const;

function isJsonContentType(contentType: string | null): boolean {
  return !!contentType && /\bapplication\/(json|.*\+json)\b/i.test(contentType);
}

function mayContainDebugFields(raw: string): boolean {
  return FRAPPE_DEBUG_FIELDS.some((field) => raw.includes(`"${field}"`));
}

function stripDebugFields(payload: unknown, targetUrl: string): { changed: boolean; payload: unknown } {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { changed: false, payload };
  }

  const record = payload as Record<string, unknown>;
  const removed: string[] = [];

  for (const field of FRAPPE_DEBUG_FIELDS) {
    if (field in record) {
      removed.push(field);
      delete record[field];
    }
  }

  if (removed.length === 0) return { changed: false, payload };

  logger.security(`Stripped Frappe debug field(s) [${removed.join(', ')}] from the response for ${targetUrl}`);
  return { changed: true, payload: record };
}

export interface BuildClientResponseOptions {
  /** Route prefix a relayed `Location` should be rewritten onto (`/api/proxy`). */
  proxyPrefix?: string;
}

/**
 * Relays the upstream response to the browser with headers allowlisted and,
 * for JSON, debug fields removed.
 */
export async function buildClientResponse(
  response: Response,
  targetUrl: string,
  options: BuildClientResponseOptions = {}
): Promise<{ body: BodyInit | null; init: ResponseInit }> {
  const headers = sanitizeResponseHeaders(response.headers);

  const location = response.headers.get('location');
  if (location) {
    const rewritten = options.proxyPrefix ? rewriteLocation(location, options.proxyPrefix) : null;
    if (rewritten) {
      headers.set('location', rewritten);
    } else {
      logger.security(`Dropped a Location header from ${targetUrl} that did not resolve to the backend origin`);
    }
  }

  const init: ResponseInit = {
    status: response.status,
    statusText: response.statusText,
    headers,
  };

  if (!isJsonContentType(response.headers.get('content-type'))) {
    return { body: response.body, init };
  }

  const raw = await response.text();
  if (!raw) return { body: raw, init };

  if (response.ok && !mayContainDebugFields(raw)) return { body: raw, init };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    logger.security(`Non-JSON body on a JSON response from ${targetUrl}; replaced with a generic error`);
    return {
      body: JSON.stringify({ message: 'The server returned an unexpected response.' }),
      init,
    };
  }

  const { changed, payload } = stripDebugFields(parsed, targetUrl);
  return { body: changed ? JSON.stringify(payload) : raw, init };
}
