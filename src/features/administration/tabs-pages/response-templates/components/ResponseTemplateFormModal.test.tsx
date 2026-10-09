// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../../messages/en.json';
import { ResponseTemplateFormModal, type ResponseTemplateFormModalProps } from './ResponseTemplateFormModal';

const OPTIONS = {
  actions: [{ value: 'Resolved', label: 'Resolved' }],
  departments: [{ value: 'DEPT-INPUTS', label: 'Inputs Supply' }],
  serviceCategories: [{ value: 'Inputs', label: 'Inputs' }],
};

function renderModal(props: Partial<ResponseTemplateFormModalProps> = {}) {
  const handlers = {
    onCreate: vi.fn().mockResolvedValue({}),
    onUpdate: vi.fn().mockResolvedValue({}),
    onClose: vi.fn(),
  };
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ResponseTemplateFormModal {...OPTIONS} {...handlers} {...props} />
    </NextIntlClientProvider>
  );
  return handlers;
}

const change = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('ResponseTemplateFormModal', () => {
  afterEach(cleanup);

  it('creates a template whose body joins the two parts', async () => {
    const { onCreate, onClose } = renderModal();

    change(/^Title/, 'Fertilizer delivered');
    fireEvent.change(screen.getByRole('combobox', { name: /Action/i }), { target: { value: 'Resolved' } });
    change(/Service Category/, 'Inputs');
    change(/Action taken/, 'Checked stock for {{ ticket_number }}.');
    change(/Resolution summary/, 'Delivered on {{ today }}.');
    fireEvent.click(screen.getByRole('button', { name: 'Add template' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onCreate).toHaveBeenCalledWith({
      title: 'Fertilizer delivered',
      action: 'Resolved',
      department: undefined,
      service_category: 'Inputs',
      body: 'Action taken:\nChecked stock for {{ ticket_number }}.\n\nResolution summary:\nDelivered on {{ today }}.',
      is_active: true,
    });
  });

  it('opens an existing template split into its two parts and clears a scope with null', async () => {
    const { onUpdate } = renderModal({
      template: {
        template: 'TPL-1',
        title: 'Old title',
        action: 'Resolved',
        department: 'DEPT-INPUTS',
        service_category: null,
        body: 'Action taken:\nCalled the agent.\n\nResolution summary:\nPaid.',
        usage_count: 3,
        is_active: true,
      },
    });

    expect(screen.getByLabelText(/Template code/)).toBeDisabled();
    expect(screen.getByLabelText(/Action taken/)).toHaveValue('Called the agent.');
    expect(screen.getByLabelText(/Resolution summary/)).toHaveValue('Paid.');

    change(/^Department/, '');
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
    expect(onUpdate).toHaveBeenCalledWith('TPL-1', expect.objectContaining({ department: null, title: 'Old title' }));
  });

  it('keeps the dialog open and shows the error when saving fails', async () => {
    const { onClose } = renderModal({ onCreate: vi.fn().mockRejectedValue(new Error('Template code already exists')) });

    change(/^Title/, 'T');
    fireEvent.change(screen.getByRole('combobox', { name: /Action/i }), { target: { value: 'Resolved' } });
    change(/Action taken/, 'A');
    change(/Resolution summary/, 'B');
    fireEvent.click(screen.getByRole('button', { name: 'Add template' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Template code already exists');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('displays field validation errors and halts submission on empty submit', async () => {
    const { onCreate, onClose } = renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Add template' }));

    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(screen.getByText('Please select an action')).toBeInTheDocument();
    expect(screen.getByText('Resolution summary is required')).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
