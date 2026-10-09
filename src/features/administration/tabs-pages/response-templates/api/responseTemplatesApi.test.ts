import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createResponseTemplate,
  fetchResponseTemplates,
  retireResponseTemplate,
  updateResponseTemplate,
} from './responseTemplatesApi';

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

describe('responseTemplatesApi', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('lists templates, leaving out unset filters', async () => {
    const fetchMock = mockFetch({ response_templates: [], pagination: {} });
    await fetchResponseTemplates({ page_size: 100, service_category: 'Inputs', department: undefined });
    const { url, method } = lastCall(fetchMock);
    expect(method).toBe('GET');
    expect(url).toContain('/api/proxy/api/v1/response-templates?page_size=100&service_category=Inputs');
  });

  it('creates, updates and retires by template code', async () => {
    const fetchMock = mockFetch({ response_template: {} });

    await createResponseTemplate({ title: 'T', action: 'Resolved', body: 'B' });
    expect(lastCall(fetchMock)).toMatchObject({ method: 'POST', body: { title: 'T', action: 'Resolved', body: 'B' } });
    expect(lastCall(fetchMock).url).toMatch(/\/api\/v1\/response-templates$/);

    await updateResponseTemplate('TPL 1', { department: null });
    expect(lastCall(fetchMock)).toMatchObject({ method: 'PATCH', body: { department: null } });
    expect(lastCall(fetchMock).url).toContain('/api/v1/response-templates/TPL%201');

    await retireResponseTemplate('TPL 1');
    expect(lastCall(fetchMock)).toMatchObject({ method: 'DELETE' });
  });
});
