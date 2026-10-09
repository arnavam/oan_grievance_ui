import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchNotificationPlaceholders,
  fetchNotificationTemplates,
  getNotificationTemplate,
  updateNotificationTemplate,
} from './notificationTemplatesApi';

const originalFetch = global.fetch;

function mockFetch(data: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ status: 'success', data }), { status: 200 })
  );
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

const lastCall = (fetchMock: ReturnType<typeof vi.fn>) => {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
  return { url, method: init.method, body: init.body ? JSON.parse(init.body as string) : undefined };
};

describe('notificationTemplatesApi', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('lists notification templates, leaving out unset filters', async () => {
    const fetchMock = mockFetch({ templates: [], pagination: {} });
    await fetchNotificationTemplates({ page_size: 100, channel: 'Email', recipient_type: undefined });
    const { url, method } = lastCall(fetchMock);
    expect(method).toBe('GET');
    expect(url).toContain('/api/proxy/api/v1/notification-templates?page_size=100&channel=Email');
  });

  it('gets a single template by name', async () => {
    const fetchMock = mockFetch({ template: { name: 'Grievance: Test' } });
    await getNotificationTemplate('Grievance: Test');
    const { url, method } = lastCall(fetchMock);
    expect(method).toBe('GET');
    expect(url).toContain('/api/proxy/api/v1/notification-templates/Grievance%3A%20Test');
  });

  it('updates a template via PATCH', async () => {
    const fetchMock = mockFetch({ template: { name: 'Grievance: Test', enabled: true } });
    await updateNotificationTemplate('Grievance: Test', { enabled: true, subject: 'New Subject' });
    const { url, method, body } = lastCall(fetchMock);
    expect(method).toBe('PATCH');
    expect(url).toContain('/api/proxy/api/v1/notification-templates/Grievance%3A%20Test');
    expect(body).toEqual({ enabled: true, subject: 'New Subject' });
  });

  it('fetches notification placeholders', async () => {
    const fetchMock = mockFetch({
      placeholders: [
        {
          key: '{ticket_number}',
          field: 'ticket_number',
          label: 'Ticket Number',
          description: 'Unique grievance identifier',
          example: 'TKT-2026-00001',
        },
      ],
      total_count: 1,
    });
    const result = await fetchNotificationPlaceholders();
    const { url, method } = lastCall(fetchMock);
    expect(method).toBe('GET');
    expect(url).toContain('/api/proxy/api/v1/notification-templates/placeholders');
    expect(result.placeholders).toHaveLength(1);
    expect(result.placeholders?.[0]?.key).toBe('{ticket_number}');
  });
});
