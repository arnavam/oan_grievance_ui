// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SuggestionInput } from './SuggestionInput';

const OPTIONS = ['Fertilizer Shortage', 'Payment Failure', 'Seed Quality Issue'];

function Harness({ onEscape }: { onEscape?: () => void }) {
  const [value, setValue] = useState('');
  return (
    <div onKeyDown={(e) => e.key === 'Escape' && onEscape?.()}>
      <label htmlFor="type">Grievance Type</label>
      <SuggestionInput id="type" value={value} onChange={setValue} suggestions={OPTIONS} />
    </div>
  );
}

const open = () => {
  const input = screen.getByRole('combobox', { name: 'Grievance Type' });
  fireEvent.focus(input);
  return input;
};

describe('SuggestionInput', () => {
  afterEach(cleanup);

  it('opens a list under the field on focus and filters it as you type', () => {
    render(<Harness />);
    const input = open();
    expect(screen.getAllByRole('option')).toHaveLength(3);

    fireEvent.change(input, { target: { value: 'seed' } });
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Seed Quality Issue']);
  });

  it('fills the field when an option is chosen, and closes the list', () => {
    render(<Harness />);
    const input = open();
    fireEvent.mouseDown(screen.getByRole('option', { name: 'Payment Failure' }));

    expect(input).toHaveValue('Payment Failure');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('picks with the arrow keys and Enter, and still accepts text that is not a suggestion', () => {
    render(<Harness />);
    const input = open();
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(input).toHaveValue('Payment Failure');

    fireEvent.change(input, { target: { value: 'A brand new type' } });
    expect(input).toHaveValue('A brand new type');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes only the list on Escape, without reaching an outer Escape handler', () => {
    const onEscape = vi.fn();
    render(<Harness onEscape={onEscape} />);
    const input = open();
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onEscape).not.toHaveBeenCalled();
  });
});
