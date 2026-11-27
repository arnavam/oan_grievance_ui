import { fetchApi } from '@/lib/api';
import type { RoleLevel, RoleLevelListData } from '../types';

/** Corresponding REST endpoint: GET /api/v1/role-levels */
export async function fetchRoleLevels(options: { signal?: AbortSignal } = {}): Promise<RoleLevel[]> {
  const data = await fetchApi<RoleLevelListData>('/api/v1/role-levels', { method: 'GET', signal: options.signal });
  return data?.role_levels ?? [];
}
