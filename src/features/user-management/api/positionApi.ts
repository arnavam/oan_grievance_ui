import { fetchApi } from '@/lib/api';
import type { PositionListData } from '../types';

/**
 * The designations (Crop DA, Woreda Crop SMS, ...) the service defines for a role level.
 *
 * Corresponding REST endpoint: GET /api/v1/positions
 */
export async function fetchPositions(
  params: { role_level?: string; active?: boolean; page_size?: number } = {},
  options: { signal?: AbortSignal } = {}
): Promise<PositionListData> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return fetchApi<PositionListData>(`/api/v1/positions${text ? `?${text}` : ''}`, {
    method: 'GET',
    signal: options.signal,
  });
}
