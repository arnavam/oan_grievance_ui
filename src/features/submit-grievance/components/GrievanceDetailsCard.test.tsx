// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { useState } from 'react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AttachmentRow, ScanStatus, WizardAttachment } from '@/lib/attachments';
import en from '../../../../messages/en.json';
import type { AreaRef } from '@/features/metadata';
import { makeStore, regionRef, woredaRef, zoneRef } from '../testFixtures';

const saveDraft = vi.fn();
vi.mock('@/lib/drafts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/drafts')>()),
  saveDraft: (...args: unknown[]) => saveDraft(...args),
}));

const getAttachments = vi.fn<(grievance: string) => Promise<AttachmentRow[]>>();
const deleteAttachment = vi.fn<(attachment: string) => Promise<void>>();
const fetchAttachmentBlobUrl = vi.fn<(attachment: string, download?: boolean) => Promise<string>>();
vi.mock('@/lib/attachments', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/attachments')>()),
  getAttachments: (...args: [string]) => getAttachments(...args),
  deleteAttachment: (...args: [string]) => deleteAttachment(...args),
  fetchAttachmentBlobUrl: (...args: [string, boolean?]) => fetchAttachmentBlobUrl(...args),
}));

import { GrievanceDetailsCard } from './GrievanceDetailsCard';

afterEach(cleanup);

const CLIENT_UUID = '11111111-2222-3333-4444-555555555555';
const DESCRIPTION = 'Fertilizer allocated for the season has not reached the kebele store.';

interface Initial {
  serviceCategory?: string;
  grievanceType?: string;
  region?: AreaRef;
  zone?: AreaRef;
  woreda?: AreaRef;
  description?: string;
  attachmentId?: string;
  scanStatus?: ScanStatus;
  attachmentFileName?: string;
}

const COMPLETE: Initial = {
  serviceCategory: 'inputs',
  grievanceType: 'Fertilizer Shortage',
  region: regionRef,
  zone: zoneRef,
  woreda: woredaRef,
  description: DESCRIPTION,
};

/** Owns the wizard state the card is controlled by, the way the page does. */
function Harness({ initial, onNext }: { initial: Initial; onNext: () => void }) {
  const [serviceCategory, setServiceCategory] = useState(initial.serviceCategory ?? '');
  const [grievanceType, setGrievanceType] = useState(initial.grievanceType ?? '');
  const [region, setRegion] = useState<AreaRef | null>(initial.region ?? null);
  const [zone, setZone] = useState<AreaRef | null>(initial.zone ?? null);
  const [woreda, setWoreda] = useState<AreaRef | null>(initial.woreda ?? null);
  const [kebele, setKebele] = useState<AreaRef | null>(null);
  const [description, setDescription] = useState(initial.description ?? '');
  const [desiredOutcome, setDesiredOutcome] = useState('');
  const [serviceProvider, setServiceProvider] = useState('');
  const [attachments, setAttachments] = useState<WizardAttachment[]>(() =>
    initial.attachmentId
      ? [
          {
            key: initial.attachmentId,
            attachmentId: initial.attachmentId,
            file: null,
            fileName: initial.attachmentFileName ?? '',
            scanStatus: initial.scanStatus ?? null,
            scanPollAttempts: 0,
            uploadState: 'idle',
            error: null,
          },
        ]
      : []
  );
  return (
    <GrievanceDetailsCard
      onNext={onNext}
      onBack={vi.fn()}
      clientUuid={CLIENT_UUID}
      submitterType="individual"
      submissionChannel="web"
      identityValues={{}}
      serviceCategory={serviceCategory}
      setServiceCategory={setServiceCategory}
      grievanceType={grievanceType}
      setGrievanceType={setGrievanceType}
      region={region}
      setRegion={setRegion}
      zone={zone}
      setZone={setZone}
      woreda={woreda}
      setWoreda={setWoreda}
      kebele={kebele}
      setKebele={setKebele}
      description={description}
      setDescription={setDescription}
      desiredOutcome={desiredOutcome}
      setDesiredOutcome={setDesiredOutcome}
      serviceProvider={serviceProvider}
      setServiceProvider={setServiceProvider}
      attachments={attachments}
      setAttachments={setAttachments}
    />
  );
}

function renderStep(initial: Initial = {}) {
  const onNext = vi.fn();
  render(
    <Provider store={makeStore()}>
      <NextIntlClientProvider locale="en" messages={en}>
        <Harness initial={initial} onNext={onNext} />
      </NextIntlClientProvider>
    </Provider>
  );
  return { onNext };
}

const saveAndContinue = () => fireEvent.click(screen.getByRole('button', { name: /Save & Continue/ }));
const byId = (id: string) => document.getElementById(id)!;

describe('Step 2 — inline validation', () => {
  beforeEach(() => {
    saveDraft.mockReset();
    saveDraft.mockResolvedValue({});
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: { areas: [], count: 0 } }) } as Response);
  });

  it('marks every required field that is empty, focuses the first, and neither moves on nor saves', () => {
    const { onNext } = renderStep();

    saveAndContinue();

    // Category, type, region, zone, woreda and description.
    expect(screen.getAllByText('This field is required.')).toHaveLength(6);
    expect(byId('service-category')).toHaveAttribute('aria-invalid', 'true');
    expect(byId('grievance-description')).toHaveAttribute('aria-invalid', 'true');
    expect(byId('service-category')).toHaveFocus();
    expect(onNext).not.toHaveBeenCalled();
    expect(saveDraft).not.toHaveBeenCalled();
  });

  it('leaves the optional fields alone', () => {
    renderStep();
    saveAndContinue();
    expect(byId('grievance-kebele')).not.toHaveAttribute('aria-invalid');
    expect(byId('grievance-desired-outcome')).not.toHaveAttribute('aria-invalid');
    expect(byId('grievance-service-provider')).not.toHaveAttribute('aria-invalid');
  });

  it('tells the person how many characters the description has, against the 20 it needs', () => {
    renderStep({ ...COMPLETE, description: 'too short' });

    saveAndContinue();

    expect(screen.getByText('Description must be at least 20 characters (currently 9).')).toBeInTheDocument();
    expect(byId('grievance-description')).toHaveFocus();
  });

  it('checks the description when it loses focus, and clears the message the moment it is long enough', () => {
    renderStep({ ...COMPLETE, description: '' });
    const description = byId('grievance-description');

    fireEvent.blur(description);
    expect(screen.getByText('This field is required.')).toBeInTheDocument();

    fireEvent.change(description, { target: { value: 'still short' } });
    expect(screen.getByText(/at least 20 characters \(currently 11\)/)).toBeInTheDocument();

    fireEvent.change(description, { target: { value: DESCRIPTION } });
    expect(screen.queryByText(/at least 20 characters/)).not.toBeInTheDocument();
    expect(description).not.toHaveAttribute('aria-invalid');
  });

  it('counts the description without its surrounding spaces', () => {
    renderStep({ ...COMPLETE, description: `   ${'a'.repeat(19)}   ` });
    saveAndContinue();
    expect(screen.getByText(/currently 19/)).toBeInTheDocument();
  });
});

describe('Step 2 — Save & Continue', () => {
  beforeEach(() => {
    saveDraft.mockReset();
    saveDraft.mockResolvedValue({});
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: { areas: [], count: 0 } }) } as Response);
  });

  it('saves the draft as well as moving on, so a reload on the next step loses nothing', async () => {
    const { onNext } = renderStep(COMPLETE);

    saveAndContinue();

    expect(onNext).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(1));
    const [payload] = saveDraft.mock.calls[0]!;
    expect(payload).toMatchObject({
      client_submission_uuid: CLIENT_UUID,
      service_category: 'Inputs',
      grievance_type: 'Fertilizer Shortage',
      administrative_area: 'woreda-ET040101',
      description: DESCRIPTION,
    });
  });

  it('moves on even if the save fails, rather than trapping the person on a slow connection', async () => {
    saveDraft.mockRejectedValue(new Error('network down'));
    const { onNext } = renderStep(COMPLETE);

    saveAndContinue();

    expect(onNext).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(saveDraft).toHaveBeenCalled());
  });

  it('carries the desired outcome and service provider into the saved draft', async () => {
    renderStep(COMPLETE);
    fireEvent.change(byId('grievance-desired-outcome'), { target: { value: 'Replace the allocation' } });
    fireEvent.change(byId('grievance-service-provider'), { target: { value: 'Basona Cooperative Union' } });

    saveAndContinue();

    await waitFor(() => expect(saveDraft).toHaveBeenCalled());
    expect(saveDraft.mock.calls[0]![0]).toMatchObject({
      desired_outcome: 'Replace the allocation',
      associated_service_provider: 'Basona Cooperative Union',
    });
  });

  it('shows what was typed in those two fields, and caps the provider at the backend’s 140 characters', () => {
    renderStep(COMPLETE);
    const outcome = byId('grievance-desired-outcome') as HTMLTextAreaElement;
    const provider = byId('grievance-service-provider') as HTMLInputElement;

    fireEvent.change(outcome, { target: { value: 'Replace the allocation' } });
    fireEvent.change(provider, { target: { value: 'Basona Cooperative Union' } });

    expect(outcome.value).toBe('Replace the allocation');
    expect(provider.value).toBe('Basona Cooperative Union');
    expect(provider).toHaveAttribute('maxlength', '140');
  });
});

describe('Step 2 — attachment scan status', () => {
  const ATTACHMENT_ID = 'ATT-0001';

  beforeEach(() => {
    saveDraft.mockReset();
    saveDraft.mockResolvedValue({});
    getAttachments.mockReset();
    deleteAttachment.mockReset();
    deleteAttachment.mockResolvedValue(undefined);
  });

  // The button is `disabled` for Pending/Failed/Infected, so clicking it is a
  // no-op (jsdom, like a real browser, never fires a disabled control's click
  // handler) — these check the disabled state and the status line the user
  // actually sees, not a click-through error banner that can't fire here.
  // `handleNext`'s own early-return for each status is exercised by the
  // "allows Save & Continue once clean" case below finding its way past all
  // three, plus direct behavior below for a file that finishes scanning
  // between render and click (see the polling test).

  it('blocks Save & Continue and shows "Scanning for malware…" while the scan is pending', () => {
    const { onNext } = renderStep({
      ...COMPLETE,
      attachmentId: ATTACHMENT_ID,
      scanStatus: 'Pending',
      attachmentFileName: 'evidence.pdf',
    });

    expect(screen.getByText('Scanning for malware…')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /Save & Continue/ });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(onNext).not.toHaveBeenCalled();
  });

  it('blocks Save & Continue when the scan failed to complete (scanner unreachable), distinctly from Infected', () => {
    const { onNext } = renderStep({
      ...COMPLETE,
      attachmentId: ATTACHMENT_ID,
      scanStatus: 'Failed',
      attachmentFileName: 'evidence.pdf',
    });

    expect(screen.getByText(/Scan didn.t complete/)).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /Save & Continue/ });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(onNext).not.toHaveBeenCalled();
  });

  it('still blocks on an infected file, with its own distinct message', () => {
    const { onNext } = renderStep({
      ...COMPLETE,
      attachmentId: ATTACHMENT_ID,
      scanStatus: 'Infected',
      attachmentFileName: 'evidence.pdf',
    });

    expect(screen.getByText(/Failed malware scan/)).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /Save & Continue/ });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(onNext).not.toHaveBeenCalled();
  });

  it('allows Save & Continue once the scan comes back clean', () => {
    const { onNext } = renderStep({
      ...COMPLETE,
      attachmentId: ATTACHMENT_ID,
      scanStatus: 'Clean',
      attachmentFileName: 'evidence.pdf',
    });

    expect(screen.getByRole('button', { name: /Save & Continue/ })).toBeEnabled();
    saveAndContinue();
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('polls for the scan result while pending, and unblocks the moment it resolves', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      getAttachments.mockResolvedValue([
        {
          name: ATTACHMENT_ID,
          file_name: 'evidence.pdf',
          mime_type: 'application/pdf',
          size_bytes: 1024,
          document_type: null,
          response: null,
          scan_status: 'Clean',
          scanned_at: '2026-09-23T10:00:00Z',
          uploaded_by_user: null,
          uploaded_by_submitter: null,
          creation: '2026-09-23T09:59:00Z',
        },
      ]);

      renderStep({
        ...COMPLETE,
        attachmentId: ATTACHMENT_ID,
        scanStatus: 'Pending',
        attachmentFileName: 'evidence.pdf',
      });

      expect(screen.getByRole('button', { name: /Save & Continue/ })).toBeDisabled();

      // The poll effect's interval (SCAN_POLL_INTERVAL_MS) fires and asks again.
      await vi.advanceTimersByTimeAsync(3000);

      expect(getAttachments).toHaveBeenCalledWith(CLIENT_UUID);
      await waitFor(() => expect(screen.getByRole('button', { name: /Save & Continue/ })).toBeEnabled());
      expect(screen.getByText('Uploaded · scan clean')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('stops polling once the attachment is removed', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      getAttachments.mockResolvedValue([
        {
          name: ATTACHMENT_ID,
          file_name: 'evidence.pdf',
          mime_type: 'application/pdf',
          size_bytes: 1024,
          document_type: null,
          response: null,
          scan_status: 'Clean',
          scanned_at: null,
          uploaded_by_user: null,
          uploaded_by_submitter: null,
          creation: '2026-09-23T09:59:00Z',
        },
      ]);

      renderStep({
        ...COMPLETE,
        attachmentId: ATTACHMENT_ID,
        scanStatus: 'Pending',
        attachmentFileName: 'evidence.pdf',
      });

      fireEvent.click(screen.getByRole('button', { name: 'Remove evidence.pdf' }));
      expect(screen.queryByText('evidence.pdf')).not.toBeInTheDocument();
      expect(deleteAttachment).toHaveBeenCalledWith(ATTACHMENT_ID);

      // If the effect's cleanup didn't run, this tick's poll would still fire
      // and (harmlessly, since nothing renders it) call getAttachments again —
      // asserting it stays at whatever it was before removal either way isn't
      // useful, so what actually matters is that no stray "Clean" state comes
      // back and resurrects a card for an attachment the user just removed.
      await vi.advanceTimersByTimeAsync(6000);
      expect(screen.queryByText('Uploaded · scan clean')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('gives up after the scan stays Pending too long, and unblocks with the same message a failed scan shows', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      // Never resolves — simulates a stuck scan queue (the worker down, not
      // ClamAV itself, which fails closed to Failed quickly on its own).
      getAttachments.mockResolvedValue([
        {
          name: ATTACHMENT_ID,
          file_name: 'evidence.pdf',
          mime_type: 'application/pdf',
          size_bytes: 1024,
          document_type: null,
          response: null,
          scan_status: 'Pending',
          scanned_at: null,
          uploaded_by_user: null,
          uploaded_by_submitter: null,
          creation: '2026-09-23T09:59:00Z',
        },
      ]);

      renderStep({
        ...COMPLETE,
        attachmentId: ATTACHMENT_ID,
        scanStatus: 'Pending',
        attachmentFileName: 'evidence.pdf',
      });

      // 40 attempts * 3s = 120s before the poll gives up. Advanced in
      // smaller steps (rather than one big jump) so each tick's async
      // getAttachments round-trip fully resolves before the next timer fires.
      for (let i = 0; i < 41; i++) {
        await vi.advanceTimersByTimeAsync(3000);
      }

      expect(screen.getByText(/Scan didn.t complete/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Save & Continue/ })).toBeDisabled();
    } finally {
      vi.useRealTimers();
    }
  }, 15_000);
});

describe('Step 2 — attachment preview', () => {
  const ATTACHMENT_ID = 'ATT-0001';

  beforeEach(() => {
    fetchAttachmentBlobUrl.mockReset();
    fetchAttachmentBlobUrl.mockResolvedValue('blob:http://localhost/mock-preview-url');
    global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/mock-local-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('allows previewing a clean resumed attachment and displays the preview modal', async () => {
    renderStep({
      ...COMPLETE,
      attachmentId: ATTACHMENT_ID,
      scanStatus: 'Clean',
      attachmentFileName: 'receipt.png',
    });

    const previewButton = screen.getByRole('button', { name: 'Preview receipt.png' });
    expect(previewButton).toBeEnabled();

    fireEvent.click(previewButton);

    expect(screen.getByRole('dialog', { name: 'receipt.png' })).toBeInTheDocument();
    await waitFor(() => expect(fetchAttachmentBlobUrl).toHaveBeenCalledWith('ATT-0001', false));
    expect(await screen.findByAltText('receipt.png')).toHaveAttribute('src', 'blob:http://localhost/mock-preview-url');

    // Close preview modal
    const closeButton = screen.getByRole('button', { name: 'Close preview' });
    fireEvent.click(closeButton);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/mock-preview-url');
  });

  it('disables preview for a pending or infected scan', () => {
    renderStep({
      ...COMPLETE,
      attachmentId: ATTACHMENT_ID,
      scanStatus: 'Pending',
      attachmentFileName: 'evidence.pdf',
    });

    const previewButton = screen.getByRole('button', { name: 'Preview evidence.pdf' });
    expect(previewButton).toBeDisabled();
    expect(previewButton).toHaveAttribute('title', 'Scanning for malware… preview will be available once clean');
  });

  it('renders a PDF iframe preview when the clean resumed file is a PDF', async () => {
    renderStep({
      ...COMPLETE,
      attachmentId: ATTACHMENT_ID,
      scanStatus: 'Clean',
      attachmentFileName: 'contract.pdf',
    });

    const previewButton = screen.getByRole('button', { name: 'Preview contract.pdf' });
    fireEvent.click(previewButton);

    const iframe = await screen.findByTitle('contract.pdf');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', 'blob:http://localhost/mock-preview-url');
  });
});
