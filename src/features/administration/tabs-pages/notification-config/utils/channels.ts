import type { NotificationTemplate } from '../components/types';

/** The channels to offer: the service's list, else the ones the loaded templates use. */
export function resolveChannels(fromService: string[], templates: NotificationTemplate[]): string[] {
  if (fromService.length > 0) return fromService;
  return [...new Set(templates.map((tpl) => tpl.channel).filter(Boolean))];
}

/** Badge colours: SMS and Email keep theirs, any other channel (System Notification, ...) gets a neutral one. */
export function channelBadgeClass(channel: string): string {
  if (channel === 'SMS') return 'bg-[#FFF7D8] border-[#FEE685] text-[#BB4D00]';
  if (channel === 'Email') return 'bg-[#EFF6FF] border-[#C9E0FF] text-[#1447E6]';
  return 'bg-violet-50 border-violet-200 text-violet-700';
}

/** Every channel but SMS has a title/subject (an in-app notification's title, an email's subject). */
export function channelHasSubject(channel: string): boolean {
  return channel !== 'SMS';
}
