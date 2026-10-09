import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/fetchApi';
import {
  buildSubmitGrievancePayload,
  submitErrorMessage,
  submitGrievance,
} from './submitGrievanceApi';

const BASE_INPUT = {
  clientSubmissionUuid: '11111111-2222-3333-4444-555555555555',
  submissionChannelLabel: 'Web Portal',
  submitterTypeLabel: 'Individual Farmer',
  identityValues: { fullName: 'Abebe Bikila', phoneNumber: '0911223344', phoneCode: '+251', email: 'abebe@example.com' },
  serviceCategoryLabel: 'Inputs',
  grievanceType: 'Fertilizer Shortage',
  description: 'Fertilizer allocated for the season has not reached the kebele store.',
  administrativeAreaId: 'kebele-ET140108101008',
  kebele: 'Kebele 01 Center',
};

describe('buildSubmitGrievancePayload', () => {
  it('maps the wizard state onto the backend field names', () => {
    expect(buildSubmitGrievancePayload(BASE_INPUT)).toEqual({
      client_submission_uuid: '11111111-2222-3333-4444-555555555555',
      submission_channel: 'Web Portal',
      submitter_type: 'Individual Farmer',
      submitter_name: 'Abebe Bikila',
      contact_mobile: '+251911223344',
      country_code: '+251',
      phone_number: '0911223344',
      contact_email: 'abebe@example.com',
      service_category: 'Inputs',
      grievance_type: 'Fertilizer Shortage',
      description: 'Fertilizer allocated for the season has not reached the kebele store.',
      administrative_area: 'kebele-ET140108101008',
      administrative_unit: 'Kebele 01 Center',
      associated_service_provider: '',
      desired_outcome: '',
      consent_given: 1,
    });
  });

  it('trims and sends the optional desired outcome and service provider', () => {
    const payload = buildSubmitGrievancePayload({
      ...BASE_INPUT,
      desiredOutcome: '  Replace the allocation ',
      associatedServiceProvider: ' Basona Cooperative Union ',
    });
    expect(payload.desired_outcome).toBe('Replace the allocation');
    expect(payload.associated_service_provider).toBe('Basona Cooperative Union');
  });

  it('trims the description', () => {
    expect(buildSubmitGrievancePayload({ ...BASE_INPUT, description: '  padded text  ' }).description).toBe(
      'padded text'
    );
  });

  it('sends an empty administrative_unit when no kebele was chosen, so a stale one saved earlier cannot resurface', () => {
    expect(buildSubmitGrievancePayload({ ...BASE_INPUT, kebele: '' }).administrative_unit).toBe('');
    expect(buildSubmitGrievancePayload({ ...BASE_INPUT, kebele: '   ' }).administrative_unit).toBe('');
  });

  it("sends the submitter's own identity — never reaches the backend any other way for a represented submission", () => {
    const payload = buildSubmitGrievancePayload(BASE_INPUT);
    expect(payload.submitter_name).toBe('Abebe Bikila');
    expect(payload.contact_mobile).toBe('+251911223344');
    expect(payload.contact_email).toBe('abebe@example.com');
  });

  it('uses the draft id as the idempotency key', () => {
    const payload = buildSubmitGrievancePayload(BASE_INPUT);
    expect(payload.client_submission_uuid).toBe(BASE_INPUT.clientSubmissionUuid);
  });
});

describe('submitGrievance', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('POSTs the payload through the auth proxy and returns the unwrapped result', async () => {
    const backendReply = {
      data: {
        ticket_number: 'B00100010',
        status: 'Submitted',
        workflow_state: 'Submitted',
        client_submission_uuid: BASE_INPUT.clientSubmissionUuid,
        routing_rule: null,
      },
      message: 'Grievance submitted successfully',
      status: 'success',
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => backendReply,
    } as Response);

    const payload = buildSubmitGrievancePayload(BASE_INPUT);
    const result = await submitGrievance(payload);

    expect(result.ticket_number).toBe('B00100010');

    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(String(url)).toContain('/api/proxy/api/v1/grievances');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual(payload);
  });

  it('surfaces the backend per-field messages when validation fails', async () => {
    // The REST routes put `details` at the top level, next to code/message.
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: {
          description: 'Description must be at least 20 characters.',
          consent_given: 'The submitter must consent to the processing of their personal data.',
        },
      }),
    } as Response);

    await expect(submitGrievance(buildSubmitGrievancePayload(BASE_INPUT))).rejects.toThrow(
      'Description: Description must be at least 20 characters. Consent Given: The submitter must consent'
    );
  });
});

describe('submitErrorMessage', () => {
  it('passes a backend validation message through', () => {
    expect(submitErrorMessage(new ApiError('Description: Description must be at least 20 characters.', null, 400))).toBe(
      'Description: Description must be at least 20 characters.'
    );
  });

  it('replaces the bare sentinel codes with readable copy', () => {
    expect(submitErrorMessage(new Error('UNAUTHORIZED'))).toMatch(/session has expired/i);
    expect(submitErrorMessage(new Error('FORBIDDEN'))).toMatch(/not permitted/i);
    expect(submitErrorMessage(new Error('CONNECTION'))).toMatch(/could not reach the server/i);
  });

  it('treats a 5xx ApiError as a connection problem, not as its raw message', () => {
    expect(submitErrorMessage(new ApiError('The server ran into a problem.', null, 502))).toMatch(
      /could not reach the server/i
    );
  });

  it('falls back to generic copy for a non-Error rejection', () => {
    expect(submitErrorMessage('boom')).toMatch(/could not submit/i);
  });
});
