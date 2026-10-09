/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AnimatedSelect } from './AnimatedSelect';

describe('AnimatedSelect', () => {
  it('renders a labelled, closed listbox trigger with the placeholder when nothing is selected', () => {
    render(<AnimatedSelect options={['Inputs', 'Payments']} value="" onChange={vi.fn()} placeholder="Select Category" />);

    const trigger = screen.getByRole('button', { name: 'Select Category' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens the listbox, shows every option, and marks the selected one', () => {
    render(<AnimatedSelect options={['Inputs', 'Payments']} value="Payments" onChange={vi.fn()} placeholder="Select Category" />);

    fireEvent.click(screen.getByRole('button', { name: /Select Category|Payments/ }));

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    const selected = screen.getByRole('option', { name: 'Payments' });
    const unselected = screen.getByRole('option', { name: 'Inputs' });
    expect(selected).toHaveAttribute('aria-selected', 'true');
    expect(unselected).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onChange and closes when an option is picked', () => {
    const onChange = vi.fn();
    render(<AnimatedSelect options={['Inputs', 'Payments']} value="" onChange={onChange} placeholder="Select Category" />);

    fireEvent.click(screen.getByRole('button', { name: 'Select Category' }));
    fireEvent.click(screen.getByRole('option', { name: 'Inputs' }));

    expect(onChange).toHaveBeenCalledWith('Inputs');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes on Escape and returns focus to the trigger', () => {
    render(<AnimatedSelect options={['Inputs', 'Payments']} value="" onChange={vi.fn()} placeholder="Select Category" />);

    const trigger = screen.getByRole('button', { name: 'Select Category' });
    fireEvent.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('accepts `{ value, label }` options alongside plain strings', () => {
    render(
      <AnimatedSelect
        options={[{ value: 'region-ET02', label: 'Afar' }]}
        value="region-ET02"
        onChange={vi.fn()}
        placeholder="Select Region"
      />
    );

    expect(screen.getByRole('button', { name: 'Afar' })).toBeInTheDocument();
  });
});
