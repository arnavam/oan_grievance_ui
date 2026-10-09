'use client';

import { skipToken } from '@reduxjs/toolkit/query/react';
import type { AdministrativeArea } from '../types';
import { AREA_QUERY_LIMIT, areaQueryArgs, useGetAreasQuery, type AreaLevel } from '../api/areasApi';

const NO_AREAS: AdministrativeArea[] = [];

export interface UseAreasOptions {
  level: AreaLevel;
  /**
   * `area_id`s to list `level` areas under. Omit for Regions. For any other
   * level an empty list means "nothing selected above", and no request is made.
   */
  parents?: readonly string[];
  search?: string;
}

export interface UseAreasResult {
  areas: AdministrativeArea[];
  isLoading: boolean;
  isError: boolean;
  /** The backend returned `AREA_QUERY_LIMIT` rows, so there may be more — narrow with `search`. */
  isTruncated: boolean;
}

/** Administrative areas for a dropdown, cached and deduped by `areasApi`. */
export function useAreas({ level, parents, search = '' }: UseAreasOptions): UseAreasResult {
  const needsParents = level !== 'Region';
  const args = areaQueryArgs(level, parents, search);
  const skip = needsParents && args.parents.length === 0;

  const { data, isFetching, isError } = useGetAreasQuery(skip ? skipToken : args);
  const areas = skip ? NO_AREAS : (data ?? NO_AREAS);

  return {
    areas,
    isLoading: !skip && isFetching,
    isError: !skip && isError,
    isTruncated: areas.length >= AREA_QUERY_LIMIT,
  };
}
