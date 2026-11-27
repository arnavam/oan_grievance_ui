// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { FALLBACK_ROLE_LEVELS } from '../data/officers';
import type { RoleLevel } from '../types';
import { resetRoleLevelsCache, useRoleLevels } from './useRoleLevels';

const fetchRoleLevels = vi.hoisted(() => vi.fn());
vi.mock('../api/roleLevelApi', () => ({ fetchRoleLevels }));

const LADDER: RoleLevel[] = [
  { level_code: 'nodal_officer', level_name: 'Kebele Nodal Officer', level_order: 10, is_active: true },
  { level_code: 'zonal_head', level_name: 'Zonal Head', level_order: 25, is_active: true },
];

beforeEach(() => resetRoleLevelsCache());
afterEach(() => vi.clearAllMocks());

describe('useRoleLevels', () => {
  it('is not loaded until the service answers, so the fallback tabs are never shown first', async () => {
    fetchRoleLevels.mockResolvedValue(LADDER);
    const { result } = renderHook(() => useRoleLevels());

    expect(result.current.isLoaded).toBe(false);
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.levels).toEqual(LADDER);
  });

  it('shows the ladder remembered from this tab at once on a reload, then checks it', async () => {
    window.sessionStorage.setItem('oan.roleLevels', JSON.stringify(LADDER));
    fetchRoleLevels.mockResolvedValue(LADDER);
    const { result } = renderHook(() => useRoleLevels());

    expect(result.current).toEqual({ levels: LADDER, isLoaded: true });
    await waitFor(() => expect(fetchRoleLevels).toHaveBeenCalledTimes(1));
  });

  it('asks the service once for several mounts in a session', async () => {
    fetchRoleLevels.mockResolvedValue(LADDER);
    const first = renderHook(() => useRoleLevels());
    await waitFor(() => expect(first.result.current.isLoaded).toBe(true));
    const second = renderHook(() => useRoleLevels());

    expect(second.result.current.isLoaded).toBe(true);
    expect(fetchRoleLevels).toHaveBeenCalledTimes(1);
  });

  it('falls back to the old ladder, loaded, when the service cannot be reached', async () => {
    fetchRoleLevels.mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => useRoleLevels());

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.levels).toEqual(FALLBACK_ROLE_LEVELS);
  });
});
