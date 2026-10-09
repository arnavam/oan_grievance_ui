// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../../messages/en.json';
import { GlobalSlaPolicyCard } from './GlobalSlaPolicyCard';

const fetchGlobalSlaPolicy = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    policy: { max_deferral_days: 30, auto_escalation_threshold: 100, requires_supervisor_approval: true },
  })
);
const updateGlobalSlaPolicy = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    policy: { max_deferral_days: 30, auto_escalation_threshold: 100, requires_supervisor_approval: false },
  })
);
vi.mock('../api/slaSettingsApi', () => ({ fetchGlobalSlaPolicy, updateGlobalSlaPolicy }));

function renderCard() {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <GlobalSlaPolicyCard />
    </NextIntlClientProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('GlobalSlaPolicyCard', () => {
  it('reads requires_supervisor_approval (not a deferral_approval string) and pre-selects the matching radio', async () => {
    renderCard();

    const l2Radio = await screen.findByRole('radio', { name: /Require L2 Senior Officer approval/i });
    const l1Radio = screen.getByRole('radio', { name: /L1 officer self-approve/i });

    await waitFor(() => expect(l2Radio).toBeChecked());
    expect(l1Radio).not.toBeChecked();
  });

  it('sends requires_supervisor_approval as a boolean on save, not a deferral_approval string', async () => {
    renderCard();

    await screen.findByRole('radio', { name: /Require L2 Senior Officer approval/i, checked: true });
    fireEvent.click(screen.getByRole('radio', { name: /L1 officer self-approve/i }));
    fireEvent.click(screen.getByRole('button', { name: /Save Global Policy/i }));

    await waitFor(() => expect(updateGlobalSlaPolicy).toHaveBeenCalledWith(
      expect.objectContaining({ requires_supervisor_approval: false })
    ));
    const lastCallArg = updateGlobalSlaPolicy.mock.calls.at(-1)?.[0];
    expect(lastCallArg).not.toHaveProperty('deferral_approval');
  });
});
