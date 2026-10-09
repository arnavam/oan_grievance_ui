// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { kebeleRef, makeStore, regionRef, woredaRef, zoneRef } from '../testFixtures';
import { GrievanceSubmittedCard } from './GrievanceSubmittedCard';
import { ReviewAndSubmitCard } from './ReviewAndSubmitCard';

afterEach(cleanup);

const DESCRIPTION = 'Fertilizer allocated for the season has not reached the kebele store.';
const CLIENT_UUID = '11111111-2222-3333-4444-555555555555';

const BASE_DRAFT_PAYLOAD = {
  client_submission_uuid: CLIENT_UUID,
  submission_channel: 'Web Portal', // the record's name, not the wizard's "web"
  submitter_type: 'Individual Farmer',
  administrative_area: 'kebele-ET040101001', // the kebele's ID, not its name
  administrative_unit: 'Kebele 01',
  service_category: 'Inputs', // not the lowercased "inputs"
  grievance_type: 'Fertilizer Shortage',
  description: DESCRIPTION,
};

function renderCard(props: Partial<React.ComponentProps<typeof ReviewAndSubmitCard>> = {}, store = makeStore()) {
  const onSubmitted = vi.fn();
  render(
    <Provider store={store}>
      <ReviewAndSubmitCard
        onBack={vi.fn()}
        onSubmitted={onSubmitted}
        draftPayload={BASE_DRAFT_PAYLOAD}
        submitterType="individual"
        submissionChannel="web"
        identityValues={{}}
        serviceCategory="inputs"
        grievanceType="Fertilizer Shortage"
        region={regionRef}
        zone={zoneRef}
        woreda={woredaRef}
        kebele={kebeleRef}
        description={DESCRIPTION}
        attachments={[]}
        {...props}
      />
    </Provider>
  );
  return { onSubmitted };
}

const consentAndSubmit = () => {
  fireEvent.click(screen.getByText(/I consent to this grievance being shared/));
  fireEvent.click(screen.getByRole('button', { name: /Submit Grievance/ }));
};

function mockFetch(status: number, body: unknown) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
  return global.fetch as ReturnType<typeof vi.fn>;
}

describe('Review step → POST /api/v1/grievances', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('files the case with the names and IDs the backend expects, and hands back the ticket', async () => {
    const fetchMock = mockFetch(200, {
      data: { ticket_number: 'B00100010', status: 'Submitted', duplicate_submission: false },
      message: 'Grievance submitted successfully',
      status: 'success',
    });
    const { onSubmitted } = renderCard();

    consentAndSubmit();

    await waitFor(() => expect(onSubmitted).toHaveBeenCalledTimes(1));
    expect(onSubmitted).toHaveBeenCalledWith(expect.objectContaining({ ticket_number: 'B00100010' }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain('/api/proxy/api/v1/grievances');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      client_submission_uuid: CLIENT_UUID,
      submission_channel: 'Web Portal', // the record's name, not the wizard's "web"
      submitter_type: 'Individual Farmer',
      service_category: 'Inputs', // not the lowercased "inputs"
      grievance_type: 'Fertilizer Shortage',
      description: DESCRIPTION,
      administrative_area: 'kebele-ET040101001', // the kebele's ID, not its name
      administrative_unit: 'Kebele 01',
      consent_given: 1,
    });
  });

  it('files against the woreda when no kebele was chosen', async () => {
    const fetchMock = mockFetch(200, { data: { ticket_number: 'B00100011', status: 'Submitted' }, status: 'success' });
    const { onSubmitted } = renderCard({
      kebele: null,
      draftPayload: { ...BASE_DRAFT_PAYLOAD, administrative_area: 'woreda-ET040101', administrative_unit: undefined },
    });

    consentAndSubmit();

    await waitFor(() => expect(onSubmitted).toHaveBeenCalled());
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(body.administrative_area).toBe('woreda-ET040101');
    expect(body.administrative_unit).toBeUndefined();
  });

  it('sends the desired outcome and service provider the person typed, and shows them on the review', async () => {
    const fetchMock = mockFetch(200, { data: { ticket_number: 'B00100012', status: 'Submitted' }, status: 'success' });
    const { onSubmitted } = renderCard({
      desiredOutcome: '  Replace the fertilizer allocation  ',
      serviceProvider: 'Basona Cooperative Union',
      draftPayload: {
        ...BASE_DRAFT_PAYLOAD,
        desired_outcome: 'Replace the fertilizer allocation',
        associated_service_provider: 'Basona Cooperative Union',
      },
    });

    expect(screen.getByText('Replace the fertilizer allocation')).toBeInTheDocument();
    expect(screen.getByText('Basona Cooperative Union')).toBeInTheDocument();

    consentAndSubmit();

    await waitFor(() => expect(onSubmitted).toHaveBeenCalled());
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(body.desired_outcome).toBe('Replace the fertilizer allocation');
    expect(body.associated_service_provider).toBe('Basona Cooperative Union');
  });

  it('will not send until the submitter has consented', () => {
    const fetchMock = mockFetch(200, {});
    renderCard();

    expect(screen.getByRole('button', { name: /Submit Grievance/ })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows the backend’s per-field reasons and lets the person try again when it rejects the case', async () => {
    mockFetch(400, {
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: { description: 'Description must be at least 20 characters.' },
    });
    const { onSubmitted } = renderCard();

    consentAndSubmit();

    expect(await screen.findByText('Description: Description must be at least 20 characters.')).toBeInTheDocument();
    expect(onSubmitted).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Submit Grievance/ })).toBeEnabled();
  });

  it('disables the button while the request is in flight, so a double click cannot file it twice', async () => {
    let finish: (value: unknown) => void = () => {};
    global.fetch = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    renderCard();

    consentAndSubmit();

    expect(await screen.findByRole('button', { name: /Submitting/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Submitting/ }));
    expect(global.fetch).toHaveBeenCalledTimes(1);

    finish({ ok: true, status: 200, json: async () => ({ data: { ticket_number: 'B1', status: 'Submitted' } }) });
  });
});

describe('Submitted screen', () => {
  it('shows the ticket number the backend issued', () => {
    render(<GrievanceSubmittedCard result={{ ticket_number: 'B-001-0001-0', status: 'Submitted' }} />);
    expect(screen.getByText('B-001-0001-0')).toBeInTheDocument();
  });

  it('shows the status, the date a response is expected by, and who it was assigned to', () => {
    render(
      <GrievanceSubmittedCard
        result={{
          ticket_number: 'B-001-0001-0',
          status: 'Submitted',
          sla_due_date: '2026-10-05 12:00:00',
          assigned_department: 'Agriculture Office',
        }}
      />
    );
    expect(screen.getByText('Submitted')).toBeInTheDocument();
    expect(screen.getByText('5 Oct 2026')).toBeInTheDocument();
    expect(screen.getByText('Agriculture Office')).toBeInTheDocument();
  });

  it('leaves out details the backend did not return, rather than showing blanks', () => {
    render(<GrievanceSubmittedCard result={{ ticket_number: 'B-001-0001-0', status: 'Submitted' }} />);
    expect(screen.queryByText('Expected response by')).not.toBeInTheDocument();
    expect(screen.queryByText('Assigned to')).not.toBeInTheDocument();
  });

  it('warns about similar grievances filed recently, while making clear this one was registered', () => {
    render(
      <GrievanceSubmittedCard
        result={{ ticket_number: 'B-001-0001-0', status: 'Submitted', possible_duplicates: ['B-001-0000-1', 'B-001-0000-2'] }}
      />
    );
    const notice = screen.getByRole('status');
    expect(notice).toHaveTextContent('2 similar grievances');
    expect(notice).toHaveTextContent('B-001-0000-1, B-001-0000-2');
    expect(notice).toHaveTextContent('still registered');
  });

  it('says so when this is a resubmit of a grievance that already exists', () => {
    render(
      <GrievanceSubmittedCard result={{ ticket_number: 'B-001-0001-0', status: 'Submitted', duplicate_submission: true }} />
    );
    expect(screen.getByText(/had already been submitted/)).toBeInTheDocument();
  });

  it('links to the person’s grievance list', () => {
    render(<GrievanceSubmittedCard result={{ ticket_number: 'B00100010', status: 'Submitted' }} />);
    expect(screen.getByRole('link', { name: /View my grievances/ })).toHaveAttribute('href', '/all-grievances');
  });
});
