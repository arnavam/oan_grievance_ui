import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createGrievanceType,
  createServiceCategory,
  deactivateGrievanceType,
  deactivateServiceCategory,
  fetchGrievanceTypes,
  fetchServiceCategories,
  updateGrievanceType,
  updateServiceCategory,
} from './taxonomyApi';

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

describe('taxonomyApi', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('lists categories, leaving out unset filters but keeping is_active=false', async () => {
    const fetchMock = mockFetch({ service_categories: [], pagination: {} });
    await fetchServiceCategories({ page_size: 100, search: undefined, is_active: false });
    const { url, method } = lastCall(fetchMock);
    expect(method).toBe('GET');
    expect(url).toContain('/api/proxy/api/v1/service-categories?page_size=100&is_active=false');
  });

  it('creates, updates and deactivates a category by name, encoded', async () => {
    const fetchMock = mockFetch({ service_category: {} });

    await createServiceCategory({ category_name: 'Roads', code: '007' });
    expect(lastCall(fetchMock)).toMatchObject({ method: 'POST', body: { category_name: 'Roads', code: '007' } });

    await updateServiceCategory('Roads & Bridges', { is_default: true });
    expect(lastCall(fetchMock)).toMatchObject({ method: 'PATCH', body: { is_default: true } });
    expect(lastCall(fetchMock).url).toContain('/api/v1/service-categories/Roads%20%26%20Bridges');

    await deactivateServiceCategory('007');
    expect(lastCall(fetchMock)).toMatchObject({ method: 'DELETE' });
  });

  it('lists, creates, updates and deactivates grievance types', async () => {
    const fetchMock = mockFetch({ grievance_types: [], pagination: {} });
    await fetchGrievanceTypes({ service_category: 'Roads', page_size: 100 });
    expect(lastCall(fetchMock).url).toContain('/api/v1/grievance-types?service_category=Roads&page_size=100');

    await createGrievanceType({ service_category: 'Roads', type_name: 'Potholes' });
    expect(lastCall(fetchMock)).toMatchObject({
      method: 'POST',
      body: { service_category: 'Roads', type_name: 'Potholes' },
    });

    await updateGrievanceType('GTYPE-1', { is_active: true });
    expect(lastCall(fetchMock)).toMatchObject({ method: 'PATCH', body: { is_active: true } });
    expect(lastCall(fetchMock).url).toContain('/api/v1/grievance-types/GTYPE-1');

    await deactivateGrievanceType('GTYPE-1');
    expect(lastCall(fetchMock)).toMatchObject({ method: 'DELETE' });
  });
});
