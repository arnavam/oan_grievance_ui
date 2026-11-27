'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AnimatedSelect } from '@/components/submitter-identity/SI-Dropdown';
import { toAreaRef, useAreas, type AreaLevel, type AreaRef } from '@/features/metadata';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

const SEARCH_DEBOUNCE_MS = 300;

export interface AreaChoice {
  /** The area picked, at the officer's own level (a Kebele officer's Kebele). */
  area: AreaRef | null;
  /**
   * Where the officer's supervisors sit: the area one level up, as its path code (the service accepts a path
   * code wherever it takes an area). Null when the area has no parent or none is picked.
   */
  parentPath: string | null;
}

interface AreaSelectProps {
  /** The one level to choose: a Kebele officer picks a Kebele, a Zonal Head a Zone. */
  level: AreaLevel;
  onChange: (choice: AreaChoice) => void;
  invalid?: boolean;
  describedBy?: string;
  id: string;
  /** An area already chosen (editing an officer): shown selected until another is picked. */
  initial?: AreaRef | null;
}

/** An area name without the sort number the register puts in front of some ('01 Ahun Tegegn' -> 'Ahun Tegegn'). */
function displayName(name: string): string {
  return name.replace(/^\d+\s+/, '').trim() || name;
}

/** The path code of the area above `pathCode` (`ET.ET04.ET0401` -> `ET.ET04`). */
export function parentPathOf(pathCode: string): string | null {
  const parts = pathCode.split('.').filter(Boolean);
  return parts.length > 1 ? parts.slice(0, -1).join('.') : null;
}

/**
 * One searchable dropdown of every area at `level`. There can be thousands of Kebeles, so the service sends the
 * first few hundred and typing asks it for the matches. Options show the name only, without the register's
 * leading sort number.
 */
export function AreaSelect({ level, onChange, invalid, describedBy, id, initial = null }: AreaSelectProps) {
  const t = useTranslations('userManagement.add');
  const [picked, setPicked] = useState<AreaRef | null>(initial);
  const [query, setQuery] = useState('');
  const searched = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const { areas, isLoading, isError, isTruncated } = useAreas({ level, search: searched, standalone: true });

  const options = areas.map((area) => ({ value: area.area_id, label: displayName(area.area_name) }));
  if (picked && !options.some((option) => option.value === picked.id)) {
    options.unshift({ value: picked.id, label: displayName(picked.name) });
  }

  const choose = (areaId: string) => {
    const area = areas.find((a) => a.area_id === areaId);
    if (!area) {
      setPicked(null);
      onChange({ area: null, parentPath: null });
      return;
    }
    setPicked(toAreaRef(area));
    onChange({ area: toAreaRef(area), parentPath: parentPathOf(area.path_code) });
  };

  return (
    <AnimatedSelect
      id={id}
      options={options}
      value={picked?.id ?? ''}
      onChange={choose}
      onQueryChange={setQuery}
      invalid={invalid}
      describedBy={describedBy}
      clearable={false}
      note={isTruncated ? t('areaListCut') : undefined}
      placeholder={isLoading ? t('loadingAreas') : isError ? t('areasFailed') : t('chooseArea', { level: t(`area${level}`) })}
    />
  );
}
