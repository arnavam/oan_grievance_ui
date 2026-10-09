// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AttachmentRow } from '@/lib/attachments';

const getAttachmentDownloadInfo = vi.fn<(attachment: string) => Promise<{ file_name: string; file_url: string }>>();
const fetchAttachmentBlobUrl = vi.fn<(fileUrl: string) => Promise<string>>();
vi.mock('@/lib/attachments', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/attachments')>()),
  getAttachmentDownloadInfo: (...args: [string]) => getAttachmentDownloadInfo(...args),
  fetchAttachmentBlobUrl: (...args: [string]) => fetchAttachmentBlobUrl(...args),
}));

// Real backend gap still open (see attachmentDisplay.tsx) — but the download
// path is only exercisable at all with the flag off, so this file tests as
// if it had already been flipped, the way it'll actually be used later.
vi.mock('./attachmentDisplay', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./attachmentDisplay')>()),
  ATTACHMENT_DOWNLOAD_DISABLED: false,
}));

import { DocumentViewerPopup } from './DocumentViewerPopup';

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
    getAttachmentDownloadInfo.mockReset();
    fetchAttachmentBlobUrl.mockReset();
  });

  it('stays disabled for an attachment that has not scanned Clean, even with the global flag off', () => {
    render(
      <DocumentViewerPopup
        attachment={{ ...CLEAN_ROW, scan_status: 'Pending' }}
        onClose={vi.fn()}
      />
    );

    const button = screen.getByTitle('Not available until the scan completes');
    expect(button).toBeDisabled();
  });

  it('is enabled for a Clean attachment and downloads the real file', async () => {
    getAttachmentDownloadInfo.mockResolvedValue({ file_name: 'id-card.pdf', file_url: '/private/files/id-card.pdf' });
    fetchAttachmentBlobUrl.mockResolvedValue('blob:mock-url');

    render(<DocumentViewerPopup attachment={CLEAN_ROW} onClose={vi.fn()} />);

    const button = screen.getByTitle('Download');
    expect(button).toBeEnabled();
    fireEvent.click(button);

    await waitFor(() => expect(getAttachmentDownloadInfo).toHaveBeenCalledWith('ATT-0001'));
    expect(fetchAttachmentBlobUrl).toHaveBeenCalledWith('/private/files/id-card.pdf');
  });

  it('shows an error message, not just a console log, when the download fails', async () => {
    getAttachmentDownloadInfo.mockRejectedValue(new Error('boom'));

    render(<DocumentViewerPopup attachment={CLEAN_ROW} onClose={vi.fn()} />);

    fireEvent.click(screen.getByTitle('Download'));

    expect(await screen.findByText('Could not download this file right now.')).toBeInTheDocument();
  });
});
