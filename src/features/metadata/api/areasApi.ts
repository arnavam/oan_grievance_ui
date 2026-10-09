import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import type { AdministrativeArea } from '../types';
import { fetchAdministrativeAreas } from './metadataApi';

export type AreaLevel = 'Region' | 'Zone' | 'Woreda' | 'Kebele';

/**
 * Most areas one request returns. Ethiopia has ~1,400 woredas nationally, so
 * a dropdown can't list every one — past this, the caller narrows with
 * `search` rather than raising the cap.
 */
export const AREA_QUERY_LIMIT = 200;

/**
 * One `GET /api/v1/administrative-areas` request. `parents` are `area_id`s;
 * the backend returns every `level` area under them (not just direct
 * children), so a Region's woredas come back even though Zones sit between.
 *
 * Build these with `areaQueryArgs` — it sorts and dedupes `parents`, so the
 * same selection always hits the same cache entry.
 */
export interface AreaQueryArgs {
  level: AreaLevel;
  parents: string[];
  search: string;
}

export function areaQueryArgs(level: AreaLevel, parents: readonly string[] = [], search = ''): AreaQueryArgs {
  return {
    level,
    parents: Array.from(new Set(parents.filter(Boolean))).sort(),
    search: search.trim(),
  };
}

/**
 * Administrative areas are reference data that rarely change, so this is the
 * one client-side cache for them: RTK Query keys each request by its args,
 * dedupes concurrent identical requests, and never refetches one it already
 * holds (until it has been unused for `keepUnusedDataFor`).
 */
export const areasApi = createApi({
  reducerPath: 'areasApi',
  baseQuery: fakeBaseQuery<string>(),
  keepUnusedDataFor: 60 * 60,
  endpoints: (build) => ({
    getAreas: build.query<AdministrativeArea[], AreaQueryArgs>({
      queryFn: async ({ level, parents, search }, { signal }) => {
        try {
          const data = await fetchAdministrativeAreas(
            {
              level_name: level,
              parent: parents.length > 0 ? parents : undefined,
              search: search || undefined,
              limit: AREA_QUERY_LIMIT,
            },
            { signal }
          );
          return { data: data.areas ?? [] };
        } catch (err) {
          return { error: err instanceof Error ? err.message : 'Failed to load administrative areas' };
        }
      },
    }),
  }),
});

export const { useGetAreasQuery } = areasApi;
