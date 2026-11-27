import type { PlaceholderItem } from '../components/types';

/** The `{token}` a placeholder is written as in a template. */
export function placeholderToken(placeholder: PlaceholderItem): string {
  return placeholder.key || `{${placeholder.name || placeholder.field || ''}}`;
}
