import { z } from 'zod';
import { registrableSubmitterTypeSchema } from './submitterType';

/**
 * The channel Submit Grievance starts on for an account with none. Registration
 * doesn't send a channel: it has no selector, and the backend registers every
 * account under `Web Portal` itself, which is the same default.
 */
export const DEFAULT_SUBMISSION_CHANNEL = 'Web Portal';

/** A Fayda ID is 12 or 16 digits — what the backend's registration check requires too. */
export const FAYDA_ID_PATTERN = /^(?:\d{12}|\d{16})$/;

/**
 * The submitter fields `/api/auth/register` forwards to the backend, besides
 * the account's own. Parsing through this drops every other key the caller
 * sent, so nothing unvetted (a `role`, a `dedupe_key`, a `submission_channel`)
 * reaches the backend.
 */
export const registerSubmitterFieldsSchema = z.object({
  submitter_type: registrableSubmitterTypeSchema.optional(),
  fayda_id: z
    .string({ error: 'Fayda ID must be a 12- or 16-digit number.' })
    .trim()
    .regex(FAYDA_ID_PATTERN, 'Fayda ID must be a 12- or 16-digit number.')
    .optional(),
});

export type RegisterSubmitterFields = z.infer<typeof registerSubmitterFieldsSchema>;
