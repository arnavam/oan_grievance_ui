import { describe, expect, it } from 'vitest';
import { suggestTicketCode } from './ticketCode';
import { TICKET_CODE_PATTERN } from './taxonomyTypes';

describe('suggestTicketCode', () => {
  it('uses the first three allowed characters of the name', () => {
    expect(suggestTicketCode('Markets', [])).toBe('MAR');
  });

  it('skips I, L, O and U, which the service refuses', () => {
    // "Oil" has only an I, L and O: nothing allowed, so it pads with zeros.
    expect(suggestTicketCode('Oil', [])).toBe('000');
    expect(suggestTicketCode('Louis', [])).toBe('S00');
  });

  it('varies the last character when the code is taken, case-insensitively', () => {
    expect(suggestTicketCode('Markets', ['mar'])).toBe('MA0');
    expect(suggestTicketCode('Markets', ['MAR', 'MA0'])).toBe('MA1');
  });

  it('always produces an acceptable code', () => {
    for (const name of ['Credit', 'Payments & Fees', '  ', 'ብድር', 'Inputs Supply']) {
      expect(suggestTicketCode(name, [])).toMatch(TICKET_CODE_PATTERN);
    }
  });
});
