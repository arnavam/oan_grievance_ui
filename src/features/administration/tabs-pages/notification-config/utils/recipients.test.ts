import { describe, expect, it } from 'vitest';
import type { FlatRecipientOption, NotificationTemplate } from '../components/types';
import {
  recipientIdOf,
  recipientLabelOf,
  recipientOptionOf,
  resolveRecipientOptions,
  templateGoesTo,
} from './recipients';

function tpl(over: Partial<NotificationTemplate>): NotificationTemplate {
  return { name: 'n', event: 'e', channel: 'SMS', recipient_type: 'Submitter', subject: '', body: '', enabled: true, ...over };
}

const SUBMITTER: FlatRecipientOption = { id: 'submitter', label: 'Submitter', recipient_type: 'Submitter', role_level: null };
const ZONAL: FlatRecipientOption = { id: 'zonal_head', label: 'Zonal Head', recipient_type: 'Role Level', role_level: 'zonal_head' };

describe('resolveRecipientOptions', () => {
  it('uses the service list when it sent one', () => {
    expect(resolveRecipientOptions([SUBMITTER], [tpl({ role_level: 'zonal_head' })])).toEqual([SUBMITTER]);
  });

  it('otherwise builds the list from the loaded templates, once per recipient', () => {
    const options = resolveRecipientOptions([], [
      tpl({}),
      tpl({ name: 'b' }),
      tpl({ name: 'c', recipient_type: 'Role Level', role_level: 'zonal_head', role_level_name: 'Zonal Head' }),
    ]);
    expect(options.map((o) => [o.id, o.label])).toEqual([
      ['Submitter', 'Submitter'],
      ['zonal_head', 'Zonal Head'],
    ]);
  });
});

describe('matching a template to a recipient', () => {
  const options = [SUBMITTER, ZONAL];

  it('matches a role-level template by its level and others by recipient type', () => {
    expect(recipientOptionOf(tpl({ recipient_type: 'Role Level', role_level: 'zonal_head' }), options)).toBe(ZONAL);
    expect(recipientOptionOf(tpl({}), options)).toBe(SUBMITTER);
    expect(recipientIdOf(tpl({ recipient_type: 'Role Level', role_level: 'gone' }), options)).toBe('gone');
  });

  it('labels from the service, never from a fixed name', () => {
    expect(recipientLabelOf(tpl({ role_level: 'zonal_head', role_level_name: 'Zonal Head (new)' }), options)).toBe('Zonal Head (new)');
    expect(recipientLabelOf(tpl({ recipient_type: 'Department Officer' }), [])).toBe('Department Officer');
  });

  it('filters by the chosen recipient', () => {
    expect(templateGoesTo(tpl({}), SUBMITTER)).toBe(true);
    expect(templateGoesTo(tpl({ role_level: 'zonal_head' }), SUBMITTER)).toBe(false);
    expect(templateGoesTo(tpl({ role_level: 'zonal_head' }), ZONAL)).toBe(true);
  });
});
