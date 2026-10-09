// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../../messages/en.json';
import { SlaCategoryCard } from './SlaCategoryCard';
import type { SlaCategory } from './types';

const fetchGrievanceTypes = vi.hoisted(() => vi.fn().mockResolvedValue({ grievance_types: [] }));
vi.mock('../api/taxonomyApi', () => ({ fetchGrievanceTypes, MAX_PAGE_SIZE: 100 }));

const baseCategory: SlaCategory = {
  id: 'GR-SLA-1',
  category: 'Credit',
  categoryColor: 'bg-yellow-100 text-yellow-700',
  department: 'agriculture',
  configId: 'GR-SLA-1',
  slaDays: 7,
  autoEscalate: true,
  notifyOnBreach: true,
  progressPercentage: 23,
};

function renderCard(onSaveSla = vi.fn().mockResolvedValue(undefined)) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SlaCategoryCard categoryData={baseCategory} onSaveSla={onSaveSla} />
    </NextIntlClientProvider>
  );
  return onSaveSla;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SlaCategoryCard', () => {
  it('discards an edited SLA days value on Cancel instead of letting a later Save persist it', async () => {
    const onSaveSla = renderCard();
    fireEvent.click(screen.getByText('Credit'));

    const slaInput = await screen.findByLabelText(/SLA Days/i);
    fireEvent.change(slaInput, { target: { value: '99' } });
    expect(slaInput).toHaveValue(99);

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    // Re-expand: the field must show the original server value, not the discarded edit.
    fireEvent.click(screen.getByText('Credit'));
    const reopenedInput = await screen.findByLabelText(/SLA Days/i);
    expect(reopenedInput).toHaveValue(7);

    fireEvent.click(screen.getByRole('button', { name: /Save SLA/i }));
    await waitFor(() => expect(onSaveSla).toHaveBeenCalledWith('GR-SLA-1', {
      sla_days: 7,
      auto_escalate: true,
      notify_on_breach: true,
    }));
  });

  it('does not snap the SLA days field to 0 when the input is cleared', async () => {
    renderCard();
    fireEvent.click(screen.getByText('Credit'));
    const slaInput = await screen.findByLabelText(/SLA Days/i);

    fireEvent.change(slaInput, { target: { value: '' } });
    expect(slaInput).toHaveValue(null);
  });
});
