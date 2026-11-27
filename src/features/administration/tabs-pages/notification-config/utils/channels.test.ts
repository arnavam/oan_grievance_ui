import { describe, expect, it } from 'vitest';
import type { NotificationTemplate } from '../components/types';
import { channelBadgeClass, channelHasSubject, resolveChannels } from './channels';

const tpl = (channel: string): NotificationTemplate => ({
  name: channel, event: 'e', channel, recipient_type: 'Submitter', subject: '', body: '', enabled: true,
});

describe('channels', () => {
  it('uses the service list, else the loaded templates\' channels once each', () => {
    expect(resolveChannels(['SMS', 'Email', 'System Notification'], [])).toEqual(['SMS', 'Email', 'System Notification']);
    expect(resolveChannels([], [tpl('SMS'), tpl('System Notification'), tpl('SMS')])).toEqual(['SMS', 'System Notification']);
  });

  it('gives an unknown channel a neutral badge, and every channel but SMS a subject', () => {
    expect(channelBadgeClass('System Notification')).toContain('violet');
    expect(channelBadgeClass('SMS')).not.toContain('violet');
    expect(channelHasSubject('System Notification')).toBe(true);
    expect(channelHasSubject('Email')).toBe(true);
    expect(channelHasSubject('SMS')).toBe(false);
  });
});
