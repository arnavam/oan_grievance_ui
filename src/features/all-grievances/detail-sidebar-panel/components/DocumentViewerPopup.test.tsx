// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AttachmentRow } from '@/lib/attachments';

const fetchAttachmentBlobUrl = vi.fn<(attachment: string, download?: boolean) => Promise<string>>();
vi.mock('@/lib/attachments', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/attachments')>()),
  fetchAttachmentBlobUrl: (...args: [string, boolean?]) => fetchAttachmentBlobUrl(...args),
}));

// Download is still held back (see attachmentDisplay.tsx) — but the download
// path is only exercisable at all with the flag off, so this file tests as
// if it had already been flipped, the way it'll actually be used later.
vi.mock('./attachmentDisplay', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./attachmentDisplay')>()),
  ATTACHMENT_DOWNLOAD_DISABLED: false,
}));

import { DocumentViewerPopup } from './DocumentViewerPopup';

import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../messages/en.json';

function renderIntl(ui: React.ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => (
      <NextIntlClientProvider locale="en" messages={en}>
        {children}
      </NextIntlClientProvider>
    ),
  });
}


afterEach(cleanup);

const CLEAN_ROW: AttachmentRow = {
  name: 'ATT-0001',
  file_name: 'id-card.pdf',
  mime_type: 'application/pdf',
  size_bytes: 245_000,
  document_type: null,
  response: null,
  scan_status: 'Clean',
  scanned_at: '2026-09-23T10:00:00Z',
  uploaded_by_user: null,
  uploaded_by_submitter: 'SUB-001',
  creation: '2026-09-23T09:59:00Z',
};

describe('DocumentViewerPopup — Download (with the disabled flag off)', () => {
  beforeEach(() => {
    fetchAttachmentBlobUrl.mockReset();
  });

  it('stays disabled for an attachment that has not scanned Clean, even with the global flag off', () => {
    renderIntl(
      <DocumentViewerPopup
        attachment={{ ...CLEAN_ROW, scan_status: 'Pending' }}
        onClose={vi.fn()}
      />
    );

    const button = screen.getByTitle('Not available until the scan completes');
    expect(button).toBeDisabled();
  });

  it('is enabled for a Clean attachment and downloads the real file', async () => {
    fetchAttachmentBlobUrl.mockResolvedValue('blob:mock-url');

    renderIntl(<DocumentViewerPopup attachment={CLEAN_ROW} onClose={vi.fn()} />);

    const button = screen.getByTitle('Download');
    expect(button).toBeEnabled();
    fireEvent.click(button);

    await waitFor(() => expect(fetchAttachmentBlobUrl).toHaveBeenCalledWith('ATT-0001', true));
  });

  it('shows an error message, not just a console log, when the download fails', async () => {
    fetchAttachmentBlobUrl.mockRejectedValue(new Error('boom'));

    renderIntl(<DocumentViewerPopup attachment={CLEAN_ROW} onClose={vi.fn()} />);

    fireEvent.click(screen.getByTitle('Download'));

    expect(await screen.findByText('Could not download this file right now.')).toBeInTheDocument();
  });
});

describe('DocumentViewerPopup — inline preview', () => {
  beforeEach(() => {
    fetchAttachmentBlobUrl.mockReset();
  });

  it('plays a Clean voice recording inline', async () => {
    fetchAttachmentBlobUrl.mockResolvedValue('blob:voice');
    renderIntl(
      <DocumentViewerPopup
        attachment={{ ...CLEAN_ROW, file_name: 'voice.mp3', mime_type: 'audio/mpeg' }}
        onClose={vi.fn()}
      />
    );

    const player = await screen.findByLabelText('voice.mp3', { selector: 'audio' });
    expect(player).toHaveAttribute('src', 'blob:voice');
  });

  it('does not carry the previous attachment preview over when the attachment changes', async () => {
    fetchAttachmentBlobUrl.mockResolvedValue('blob:first');
    const view = renderIntl(<DocumentViewerPopup attachment={CLEAN_ROW} onClose={vi.fn()} />);
    expect(await screen.findByTitle('id-card.pdf')).toHaveAttribute('src', 'blob:first');

    view.rerender(
      <DocumentViewerPopup attachment={{ ...CLEAN_ROW, name: 'ATT-0002', file_name: 'next.pdf', scan_status: 'Pending' }} onClose={vi.fn()} />
    );

    expect(screen.queryByTitle('id-card.pdf')).not.toBeInTheDocument();
    expect(screen.getByText('Preview unavailable')).toBeInTheDocument();
  });

  it('falls back to "unavailable" for an attachment with no mime type instead of throwing', async () => {
    fetchAttachmentBlobUrl.mockResolvedValue('blob:x');
    renderIntl(
      <DocumentViewerPopup attachment={{ ...CLEAN_ROW, mime_type: null as unknown as string }} onClose={vi.fn()} />
    );

    expect(await screen.findByText('Preview unavailable')).toBeInTheDocument();
  });

  it('says so, rather than spinning, when the preview cannot be loaded', async () => {
    fetchAttachmentBlobUrl.mockRejectedValue(new Error('boom'));
    renderIntl(<DocumentViewerPopup attachment={CLEAN_ROW} onClose={vi.fn()} />);

    expect(await screen.findByText('Could not load this file right now.')).toBeInTheDocument();
  });

  it('does not download a Clean file of a type it cannot show inline, and says so straight away', () => {
    renderIntl(
      <DocumentViewerPopup
        attachment={{ ...CLEAN_ROW, file_name: 'report.docx', mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Preview unavailable')).toBeInTheDocument();
    expect(screen.queryByLabelText('Loading preview')).not.toBeInTheDocument();
    expect(fetchAttachmentBlobUrl).not.toHaveBeenCalled();
  });

  it.each([
    ['Infected', 'This file failed the malware scan and cannot be opened.'],
    ['Failed', 'The malware scan could not be completed, so this file cannot be opened.'],
    ['Pending', 'Not available until the scan completes.'],
  ] as const)('explains a %s scan accurately, not as "still scanning"', (scan_status, message) => {
    renderIntl(<DocumentViewerPopup attachment={{ ...CLEAN_ROW, scan_status }} onClose={vi.fn()} />);

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(fetchAttachmentBlobUrl).not.toHaveBeenCalled();
  });
});
