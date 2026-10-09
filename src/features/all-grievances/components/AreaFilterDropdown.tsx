'use client';

import { useState } from 'react';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { toAreaRef, useAreas, type AreaLevel, type AreaRef } from '@/features/metadata';
import { FilterDropdown, type FilterOption } from './FilterDropdown';

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Multi-select for one administrative level, searched server-side. Options
 * are keyed by `area_id`, so two areas that share a name (kebele "01" exists
 * in hundreds of woredas) stay distinct — the label names the parent when a
 * name repeats in the list.
 *
 * Selected areas are always listed first, even when the current search
 * doesn't return them, so they can still be seen and unticked.
 */
export function AreaFilterDropdown({
  label,
  level,
  parents,
  selected,
  onChange,
  disabledMessage,
}: {
  label: string;
  level: AreaLevel;
  /** The selected areas one level up. Omit for Regions; empty disables the dropdown. */
  parents?: readonly AreaRef[];
  selected: AreaRef[];
  onChange: (next: AreaRef[]) => void;
  disabledMessage?: string;
}) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  const disabled = parents !== undefined && parents.length === 0;

  const { areas, isLoading, isTruncated } = useAreas({
    level,
    parents: parents?.map((p) => p.id),
    search: debouncedSearch,
  });

  const nameCounts = new Map<string, number>();
  for (const area of areas) nameCounts.set(area.area_name, (nameCounts.get(area.area_name) ?? 0) + 1);
  const parentName = (id: string | null | undefined) => parents?.find((p) => p.id === id)?.name;

  const selectedIds = new Set(selected.map((a) => a.id));
  const options: FilterOption[] = [
    ...selected.map((a) => ({ value: a.id, label: a.name })),
    ...areas
      .filter((area) => !selectedIds.has(area.area_id))
      .map((area) => ({
        value: area.area_id,
        label:
          (nameCounts.get(area.area_name) ?? 0) > 1
            ? `${area.area_name} (${parentName(area.parent_administrative_area) ?? area.code})`
            : area.area_name,
      })),
  ];

  const handleChange = (ids: string[]) => {
    const known = new Map<string, AreaRef>(selected.map((a) => [a.id, a]));
    for (const area of areas) if (!known.has(area.area_id)) known.set(area.area_id, toAreaRef(area));
    onChange(ids.flatMap((id) => known.get(id) ?? []));
  };

  return (
    <FilterDropdown
      label={label}
      options={options}
      selected={selected.map((a) => a.id)}
      onChange={handleChange}
      isLoading={isLoading}
      disabled={disabled}
      disabledMessage={disabledMessage}
      search={{ value: search, onChange: setSearch }}
      note={isTruncated ? `Showing the first ${areas.length} — search to narrow.` : undefined}
    />
  );
}
