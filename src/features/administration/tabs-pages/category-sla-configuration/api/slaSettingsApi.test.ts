import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchGlobalSlaPolicy, updateGlobalSlaPolicy } from './slaSettingsApi';

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

describe('slaSettingsApi', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('reads and partially updates the global policy', async () => {
    const fetchMock = mockFetch({ policy: {} });

    await fetchGlobalSlaPolicy();
    expect(lastCall(fetchMock)).toMatchObject({ method: 'GET' });
    expect(lastCall(fetchMock).url).toMatch(/\/api\/proxy\/api\/v1\/sla-policy$/);

    await updateGlobalSlaPolicy({ auto_escalation_threshold: 80, requires_supervisor_approval: false });
    expect(lastCall(fetchMock)).toMatchObject({
      method: 'PATCH',
      body: { auto_escalation_threshold: 80, requires_supervisor_approval: false },
    });
  });
});
