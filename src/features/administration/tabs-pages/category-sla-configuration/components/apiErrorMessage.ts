import { ApiErrorCode, classifyError } from '@/lib/api/apiErrors';

/**
 * A readable message for a failed save. `fetchApi` throws a bare `Error` whose
 * message is the raw `ApiErrorCode` string ("FORBIDDEN"/"AUTH_ERROR") for
 * 401/403 responses — displaying that directly is meaningless to an admin.
 * Classifies those (and a 5xx) into the caller's own copy first, falling back
 * to the error's own message (a real validation reason from the backend) and
 * only then to a generic fallback.
 */
export function describeSaveError(
  err: unknown,
  messages: { auth: string; forbidden: string; connection: string; fallback: string }
): string {
  switch (classifyError(err)) {
    case ApiErrorCode.Auth:
      return messages.auth;
    case ApiErrorCode.Forbidden:
      return messages.forbidden;
    case ApiErrorCode.Connection:
      return messages.connection;
    default:
      return err instanceof Error && err.message ? err.message : messages.fallback;
  }
}
