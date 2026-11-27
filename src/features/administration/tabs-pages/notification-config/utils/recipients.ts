import type { FlatRecipientOption, NotificationTemplate } from '../components/types';

/**
 * Who a template goes to is whatever the service says: a recipient type (Submitter, Assigned Officer, ...)
 * or a role level. Nothing here names a level, so a renamed or added rung needs no change.
 */

function keyOf(template: Pick<NotificationTemplate, 'recipient_type' | 'role_level'>): string {
  return template.role_level || template.recipient_type;
}

/**
 * The recipients to offer. The service's own list when it sent one; otherwise (the options call failed)
 * the distinct recipients of the templates that did load, labelled as the service labelled them.
 */
export function resolveRecipientOptions(
  fromService: FlatRecipientOption[],
  templates: NotificationTemplate[]
): FlatRecipientOption[] {
  if (fromService.length > 0) return fromService;
  const seen = new Map<string, FlatRecipientOption>();
  for (const template of templates) {
    const id = keyOf(template);
    if (!id || seen.has(id)) continue;
    seen.set(id, {
      id,
      label: template.role_level_name || template.recipient_type || id,
      recipient_type: template.recipient_type,
      role_level: template.role_level ?? null,
      role_level_name: template.role_level_name ?? null,
    });
  }
  return [...seen.values()];
}

/** The option a template currently goes to, if the list has it. */
export function recipientOptionOf(
  template: Pick<NotificationTemplate, 'recipient_type' | 'role_level'>,
  options: FlatRecipientOption[]
): FlatRecipientOption | undefined {
  if (template.role_level) {
    return options.find((o) => o.role_level === template.role_level || o.id === template.role_level);
  }
  return (
    options.find((o) => !o.role_level && o.recipient_type === template.recipient_type) ??
    options.find((o) => o.id === template.recipient_type || o.label === template.recipient_type)
  );
}

export function recipientIdOf(template: NotificationTemplate, options: FlatRecipientOption[]): string {
  return recipientOptionOf(template, options)?.id ?? keyOf(template);
}

export function recipientLabelOf(template: NotificationTemplate, options: FlatRecipientOption[]): string {
  return (
    template.role_level_name ||
    recipientOptionOf(template, options)?.label ||
    template.role_level ||
    template.recipient_type ||
    '—'
  );
}

/** Whether a template goes to the chosen recipient. */
export function templateGoesTo(template: NotificationTemplate, option: FlatRecipientOption): boolean {
  if (option.role_level) return template.role_level === option.role_level;
  return !template.role_level && template.recipient_type === option.recipient_type;
}
