// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../../messages/en.json';
import { AddCategoryModal, type AddCategoryModalProps } from './AddCategoryModal';

vi.mock('../api/taxonomyApi', () => ({
  MAX_PAGE_SIZE: 100,
  fetchGrievanceTypes: vi.fn().mockResolvedValue({
    grievance_types: [
      { grievance_type_id: 'G1', type_name: 'Payment Failure', service_category: 'Payments', is_active: true },
      { grievance_type_id: 'G2', type_name: 'Payment Failure', service_category: 'Other', is_active: true },
    ],
    pagination: {},
  }),
}));

function renderModal(props: Partial<AddCategoryModalProps> = {}) {
  const handlers = { onCreate: vi.fn().mockResolvedValue({}), onClose: vi.fn() };
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <AddCategoryModal takenCodes={[]} {...handlers} {...props} />
    </NextIntlClientProvider>
  );
  return handlers;
}

const change = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('AddCategoryModal', () => {
  afterEach(cleanup);

  it('asks for a name and a grievance type, and sends nothing until both are given', async () => {
    const { onCreate } = renderModal();

    fireEvent.click(screen.getByRole('button', { name: /Save/ }));

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Grievance type is required')).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('creates the category with a ticket code made from its name, plus its first type', async () => {
    const { onCreate, onClose } = renderModal({ takenCodes: ['MAR'] });

    change(/^Category name/i, '  Markets  ');
    change(/^Grievance Type/i, 'Price Reporting Dispute');
    fireEvent.click(screen.getByRole('button', { name: /Save/ }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    // "MAR" is taken, so the last character is varied; SLA fields are not part of the payload.
    expect(onCreate).toHaveBeenCalledWith({ category_name: 'Markets', code: 'MA0' }, 'Price Reporting Dispute');
  });

  it('offers each existing grievance type once as a suggestion', async () => {
    renderModal();

    fireEvent.focus(screen.getByLabelText(/^Grievance Type/i));

    expect(await screen.findAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option', { name: 'Payment Failure' })).toBeInTheDocument();
  });

  it('rejects an SLA that is not a whole number of days', async () => {
    const { onCreate } = renderModal();

    change(/^Category name/i, 'Roads');
    change(/^Grievance Type/i, 'Potholes');
    change(/^SLA Days/i, '2.5');
    fireEvent.click(screen.getByRole('button', { name: /Save/ }));

    expect(await screen.findByText('SLA days must be a whole number, 1 or more')).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('stays open and shows the reason when the service refuses the category', async () => {
    const onCreate = vi.fn().mockRejectedValue(new Error('Grievance Service Category Roads already exists'));
    const { onClose } = renderModal({ onCreate });

    change(/^Category name/i, 'Roads');
    change(/^Grievance Type/i, 'Potholes');
    fireEvent.click(screen.getByRole('button', { name: /Save/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Grievance Service Category Roads already exists');
    expect(onClose).not.toHaveBeenCalled();
  });
});
