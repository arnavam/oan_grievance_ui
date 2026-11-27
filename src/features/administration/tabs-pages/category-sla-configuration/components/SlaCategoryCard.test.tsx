// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../../messages/en.json';
import { SlaCategoryCard } from './SlaCategoryCard';
import type { SlaCategory } from './types';

const baseCategory: SlaCategory = {
  id: 'Credit',
  category: 'Credit',
  categoryColor: 'bg-yellow-100 text-yellow-700',
  slaDays: 7,
  progressPercentage: 23,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SlaCategoryCard', () => {
  function renderCard(categoryData: SlaCategory = baseCategory) {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SlaCategoryCard categoryData={categoryData} />
      </NextIntlClientProvider>
    );
  }

  it('shows the base rule days, or that there is none', () => {
    renderCard();
    expect(screen.getByText(/7/)).toBeInTheDocument();
    cleanup();
    renderCard({ ...baseCategory, slaDays: null });
    expect(screen.getByText(/no base rule/i)).toBeInTheDocument();
  });

  it('does not render a grievance type dropdown', () => {
    renderCard();
    fireEvent.click(screen.getByText('Credit'));
    // The SLA is set on the SLA Rules tab: the card lists the category's types, but never picks one.
    expect(screen.queryByRole('combobox')).toBeNull();
  });
});

describe('SlaCategoryCard category deactivation', () => {
  function renderWith(props: Partial<React.ComponentProps<typeof SlaCategoryCard>>) {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SlaCategoryCard categoryData={baseCategory} {...props} />
      </NextIntlClientProvider>
    );
    fireEvent.click(screen.getByText('Credit'));
  }

  it('deactivates the category only after confirming', async () => {
    const onDeactivateCategory = vi.fn().mockResolvedValue(undefined);
    renderWith({ onDeactivateCategory });
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate category' }));
    expect(onDeactivateCategory).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    await waitFor(() => expect(onDeactivateCategory).toHaveBeenCalledOnce());
  });

  it('offers no deactivation for the default category, which the service refuses', () => {
    renderWith({ onDeactivateCategory: vi.fn(), isDefaultCategory: true });
    expect(screen.queryByRole('button', { name: 'Deactivate category' })).not.toBeInTheDocument();
  });
});

describe('SlaCategoryCard rename', () => {
  function renderWith(props: Partial<React.ComponentProps<typeof SlaCategoryCard>>) {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SlaCategoryCard categoryData={baseCategory} {...props} />
      </NextIntlClientProvider>
    );
    fireEvent.click(screen.getByText('Credit'));
  }

  it('renames the category on Save', async () => {
    const onRenameCategory = vi.fn().mockResolvedValue(undefined);
    renderWith({ onRenameCategory });
    fireEvent.change(screen.getByLabelText('Service Category'), { target: { value: ' Credit & Loans ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onRenameCategory).toHaveBeenCalledWith('Credit & Loans'));
    expect(await screen.findByRole('status')).toHaveTextContent('Renaming the category');
  });

  it('does not rename when the name is unchanged', async () => {
    const onRenameCategory = vi.fn();
    renderWith({ onRenameCategory });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled());
    expect(onRenameCategory).not.toHaveBeenCalled();
  });

  it('locks the name while a rename is still running', () => {
    renderWith({ onRenameCategory: vi.fn(), renamingTo: 'Credit & Loans' });
    expect(screen.getByLabelText('Service Category')).toHaveAttribute('readonly');
    expect(screen.getByText('Being renamed to "Credit & Loans"…')).toBeInTheDocument();
  });

  it('is read-only without a rename handler', () => {
    renderWith({});
    expect(screen.getByLabelText('Service Category')).toHaveAttribute('readonly');
  });
});
