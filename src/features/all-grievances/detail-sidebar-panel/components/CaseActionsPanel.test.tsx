// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../messages/en.json';
import { CaseActionsPanel, type CaseActionsPanelProps } from './CaseActionsPanel';

const RESOLVED_ACTIONS = [
  { action: 'Reopen', label: 'Reopen', requires_reason: true },
  { action: 'Close Case', label: 'Close Case', requires_reason: false },
];
const REPLY_ACTIONS = [{ action: 'Submitter Reply', label: 'Submitter Reply', requires_reason: true }];

function renderPanel(props: Partial<CaseActionsPanelProps> = {}) {
  const onExecute = props.onExecute ?? vi.fn().mockResolvedValue({});
  const onUploadFiles = props.onUploadFiles ?? vi.fn().mockResolvedValue([]);
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <CaseActionsPanel
        actions={RESOLVED_ACTIONS}
        isSubmitting={false}
        {...props}
        onExecute={onExecute}
        onUploadFiles={onUploadFiles}
      />
    </NextIntlClientProvider>
  );
  return { onExecute, onUploadFiles };
}

describe('CaseActionsPanel', () => {
  afterEach(cleanup);

  it('leads a resolved case with closing: rating required, comments optional', async () => {
    const { onExecute } = renderPanel();

    expect(screen.queryByRole('group', { name: 'Choose an action' })).not.toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Confirm & Close Grievance' });
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByLabelText('4 of 5 stars'));
    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    expect(onExecute).toHaveBeenCalledWith({ action: 'Close Case', reason: '', rating: 4 });
    expect(await screen.findByRole('status')).toHaveTextContent('"Close Case" done.');
  });

  it('switches a resolved case to reopening from the link', () => {
    const { onExecute } = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Not satisfied? Reopen this grievance' }));
    expect(screen.queryByRole('group', { name: /How satisfied/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'Still no delivery.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reopen' }));

    expect(onExecute).toHaveBeenCalledWith({ action: 'Reopen', reason: 'Still no delivery.', rating: null });
  });

  it('skips the action picker when only one action is offered and enforces the minimum length', () => {
    renderPanel({ actions: REPLY_ACTIONS });

    expect(screen.queryByRole('group', { name: 'Choose an action' })).not.toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Submit Additional Information' });
    fireEvent.change(screen.getByLabelText(/Additional Details/), { target: { value: 'too short' } });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Additional Details/), { target: { value: 'Card number is 1234.' } });
    expect(submit).toBeEnabled();
  });

  it('uploads supporting documents before sending the reply', async () => {
    const onExecute = vi.fn().mockResolvedValue({});
    const onUploadFiles = vi.fn().mockResolvedValue([]);
    renderPanel({ actions: REPLY_ACTIONS, onExecute, onUploadFiles });
    const file = new File(['x'], 'bank_statement.pdf', { type: 'application/pdf' });
    const exe = new File(['x'], 'virus.exe', { type: 'application/x-msdownload' });

    fireEvent.change(screen.getByLabelText('Supporting Documents'), { target: { files: [file, exe] } });
    expect(screen.getByText('bank_statement.pdf')).toBeInTheDocument();
    expect(screen.queryByText('virus.exe')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/Some files were skipped/);

    fireEvent.change(screen.getByLabelText(/Additional Details/), { target: { value: 'Statement attached.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit Additional Information' }));

    await waitFor(() => expect(onExecute).toHaveBeenCalled());
    expect(onUploadFiles).toHaveBeenCalledWith([file]);
    expect(onUploadFiles.mock.invocationCallOrder[0]).toBeLessThan(onExecute.mock.invocationCallOrder[0]!);
  });

  it('does not send the action when the upload fails', async () => {
    const onUploadFiles = vi.fn().mockRejectedValue(new Error('File too large'));
    const { onExecute } = renderPanel({ actions: REPLY_ACTIONS, onUploadFiles });
    const file = new File(['x'], 'card.png', { type: 'image/png' });

    fireEvent.change(screen.getByLabelText('Supporting Documents'), { target: { files: [file] } });
    fireEvent.change(screen.getByLabelText(/Additional Details/), { target: { value: 'Card attached here.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit Additional Information' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('File too large');
    expect(onExecute).not.toHaveBeenCalled();
  });

  it('shows the picker for several unrelated actions', () => {
    renderPanel({
      actions: [
        { action: 'Submitter Reply', label: 'Submitter Reply', requires_reason: true },
        { action: 'Withdraw', label: 'Withdraw', requires_reason: true },
      ],
    });
    expect(screen.getByRole('group', { name: 'Choose an action' })).toBeInTheDocument();
  });

  it('tells a submitter when nothing is waiting on them', () => {
    renderPanel({ actions: [] });
    expect(screen.getByText(/No action is needed from you/)).toBeInTheDocument();
  });

  it('shows the backend error when the action fails', async () => {
    renderPanel({ onExecute: vi.fn().mockRejectedValue(new Error('Action not allowed from this state')) });

    fireEvent.click(screen.getByLabelText('5 of 5 stars'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm & Close Grievance' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Action not allowed from this state');
  });

  it('correctly uses action_code and requires_rating even if action labels are localized or renamed', async () => {
    const onExecute = vi.fn().mockResolvedValue({});
    renderPanel({
      caseStatus: 'Resolved',
      actions: [
        { action: 'Deebi_Bani', action_code: 'reopen', label: 'Deebisi bani', requires_reason: true },
        { action: 'Cufaa', action_code: 'close_case', label: 'Dhimma Cufaa', requires_reason: false, requires_rating: true },
      ],
      onExecute,
    });

    // Skips multi-picker because case is resolved and provides close + reopen
    expect(screen.queryByRole('group', { name: 'Choose an action' })).not.toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Confirm & Close Grievance' });
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByLabelText('5 of 5 stars'));
    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    await waitFor(() => expect(onExecute).toHaveBeenCalled());
    expect(onExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'Cufaa',
        rating: 5,
      })
    );
  });

  it('displays character counter and validates minimum length via Zod when reason is required', async () => {
    const onExecute = vi.fn().mockResolvedValue({});
    renderPanel({
      caseStatus: 'Resolved',
      actions: [
        { action: 'Reopen', action_code: 'reopen', label: 'Reopen', requires_reason: true },
        { action: 'Close Case', action_code: 'close_case', label: 'Close Case', requires_reason: true, requires_rating: true },
      ],
      onExecute,
    });

    const submit = screen.getByRole('button', { name: 'Confirm & Close Grievance' });
    expect(submit).toBeDisabled();

    // Star rating selected
    fireEvent.click(screen.getByLabelText('5 of 5 stars'));
    expect(submit).toBeDisabled();

    // Initial counter: 0/10 min
    expect(screen.getByText('0/10 min')).toBeInTheDocument();

    const commentsInput = screen.getByLabelText(/Comments/);

    // Type 7 characters ("thanks!")
    fireEvent.change(commentsInput, { target: { value: 'thanks!' } });
    expect(screen.getByText('7/10 min')).toBeInTheDocument();
    expect(submit).toBeDisabled();

    // On blur, error appears
    fireEvent.blur(commentsInput);
    expect(screen.getByRole('alert')).toHaveTextContent('Must be at least 10 characters (currently 7).');

    // Type enough characters
    fireEvent.change(commentsInput, { target: { value: 'thanks! issue resolved.' } });
    expect(screen.getByText('23 chars')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(submit).toBeEnabled();

    fireEvent.click(submit);
    await waitFor(() => expect(onExecute).toHaveBeenCalled());
    expect(onExecute).toHaveBeenCalledWith({
      action: 'Close Case',
      reason: 'thanks! issue resolved.',
      rating: 5,
    });
  });
});
