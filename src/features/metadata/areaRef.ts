import type { AdministrativeArea } from './types';

/**
 * A selected administrative area, as held in form and filter state. `id` is
 * what goes to the backend; `name` is kept alongside it so the selection can
 * be displayed without looking it up again (it may not be in the currently
 * loaded or searched-for list).
 */
export interface AreaRef {
  id: string;
  name: string;
  /**
   * Dotted ancestry, e.g. `ET.ET04.ET0401` — what `isWithinAny` compares on.
   * Empty for a selection restored from a draft, whose hierarchy carries
   * names and ids but not path codes.
   */
  pathCode: string;
}

export function toAreaRef(area: AdministrativeArea): AreaRef {
  return { id: area.area_id, name: area.area_name, pathCode: area.path_code };
}

/** True when `area` sits somewhere under one of `ancestors`. */
export function isWithinAny(area: AreaRef, ancestors: readonly AreaRef[]): boolean {
  return ancestors.some((a) => Boolean(a.pathCode) && area.pathCode.startsWith(`${a.pathCode}.`));
}

/** Keeps only the `areas` that sit under one of `ancestors` — what a narrower selection must drop when a broader one changes. */
export function keepWithin(areas: readonly AreaRef[], ancestors: readonly AreaRef[]): AreaRef[] {
  return areas.filter((area) => isWithinAny(area, ancestors));
}
