import { fetchApi } from '@/lib/api/fetchApi';

/** The backend refuses a `search` shorter than this (`MIN_SEARCH_LENGTH`), so shorter text lists unfiltered. */
export const MIN_PROVIDER_SEARCH_LENGTH = 2;

/**
 * The first search on a freshly set up server fills the directory from its source before answering, which the
 * backend caps at about 16 s — longer than `fetchApi`'s 15 s default.
 */
const SEARCH_TIMEOUT_MS = 20000;

/** What the form keeps of a directory entry: the ID to store on the grievance, and the name to show. */
export interface ServiceProviderRef {
  id: string;
  name: string;
}

export interface ServiceProviderOption extends ServiceProviderRef {
  type: string;
  area: { id: string; name: string; path_label: string } | null;
}

interface ServiceProviderList {
  items: ServiceProviderOption[];
}

/**
 * GET /api/v1/service-providers — active providers matching `search` (name, registration number).
 * Reads the backend's local directory only. Pass `signal` so a slow earlier response can be abandoned.
 */
export async function searchServiceProviders(search: string, signal?: AbortSignal): Promise<ServiceProviderOption[]> {
  const params = new URLSearchParams({ page_size: '20' });
  const text = search.trim();
  if (text.length >= MIN_PROVIDER_SEARCH_LENGTH) params.set('search', text);
  const list = await fetchApi<ServiceProviderList>(
    `/api/v1/service-providers?${params.toString()}`,
    { signal },
    SEARCH_TIMEOUT_MS
  );
  return list.items ?? [];
}
