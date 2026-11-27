// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { GrievanceSubmittedCard } from './GrievanceSubmittedCard';

afterEach(cleanup);

describe('GrievanceSubmittedCard status PIN', () => {
  it('shows the PIN of a sensitive case the submitter filed for themselves', () => {
    render(<GrievanceSubmittedCard result={{ ticket_number: '0-C16-0001-0', status: 'Submitted', status_pin: '715480' }} />);
    expect(screen.getByText('715480')).toBeInTheDocument();
    expect(screen.getByText('Your status PIN')).toBeInTheDocument();
  });

  it('shows no PIN for an ordinary case, or one filed on someone else\'s behalf', () => {
    render(<GrievanceSubmittedCard result={{ ticket_number: 'B-001-0001-0', status: 'Submitted' }} />);
    expect(screen.queryByText('Your status PIN')).not.toBeInTheDocument();
  });
});
