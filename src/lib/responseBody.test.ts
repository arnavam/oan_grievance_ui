import { describe, expect, it } from 'vitest';
import { composeResponseBody, splitResponseBody } from './responseBody';

describe('responseBody', () => {
  it('joins both parts under their headings, trimmed', () => {
    expect(
      composeResponseBody({ actionTaken: '  Visited the cooperative.  ', resolutionSummary: '\nDelivered on 2 Oct.\n' })
    ).toBe('Action taken:\nVisited the cooperative.\n\nResolution summary:\nDelivered on 2 Oct.');
  });

  it('splits a composed body back into the same parts', () => {
    const parts = { actionTaken: 'Checked {{ ticket_number }}.\nCalled the agent.', resolutionSummary: 'Paid on {{ today }}.' };
    expect(splitResponseBody(composeResponseBody(parts))).toEqual(parts);
  });

  it('treats text without the headings as all summary', () => {
    expect(splitResponseBody('  Your payment was released.  ')).toEqual({
      actionTaken: '',
      resolutionSummary: 'Your payment was released.',
    });
  });
});
