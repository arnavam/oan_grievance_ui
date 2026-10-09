import { keepWithin, type AreaRef } from '@/features/metadata';
import type { GrievanceFilters } from '../types';

/**
 * Applies a new selection at one administrative level and drops any
 * selection below it that no longer sits under what's selected above. The
 * list API ANDs levels together, so a woreda left over from an unticked
 * region would otherwise match nothing — and it wouldn't be in the woreda
 * dropdown any more to untick.
 */
export function setAreaSelection(
  filters: GrievanceFilters,
  level: 'regions' | 'woredas' | 'kebeles',
  selection: AreaRef[]
): GrievanceFilters {
  const regions = level === 'regions' ? selection : filters.regions;
  const woredas = level === 'woredas' ? selection : keepWithin(filters.woredas, regions);
  const kebeles = level === 'kebeles' ? selection : keepWithin(filters.kebeles, woredas);
  return { ...filters, regions, woredas, kebeles };
}
