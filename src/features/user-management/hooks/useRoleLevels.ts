'use client';

import { useEffect, useState } from 'react';
import { fetchRoleLevels } from '../api/roleLevelApi';
import { FALLBACK_ROLE_LEVELS } from '../data/officers';
import type { RoleLevel } from '../types';

const STORAGE_KEY = 'oan.roleLevels';

// One request for the whole session: the ladder changes with a deploy, not while someone is on the page.
let cached: RoleLevel[] | null = null;
let pending: Promise<RoleLevel[]> | null = null;

/** The ladder from an earlier visit in this tab, so a reload shows the right tabs at once. */
function readRemembered(): RoleLevel[] | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as RoleLevel[]) : null;
  } catch {
    return null; // storage blocked or unreadable: just ask the service
  }
}

function remember(levels: RoleLevel[]): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(levels));
  } catch {
    // a convenience only
  }
}

function load(): Promise<RoleLevel[]> {
  pending ??= fetchRoleLevels()
    .then((levels) => {
      cached = levels;
      if (levels.length > 0) remember(levels);
      return levels;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

/** Forgets the loaded ladder, so the next mount asks again. For tests. */
export function resetRoleLevelsCache(): void {
  cached = null;
  pending = null;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // nothing to forget
  }
}

export interface RoleLevelsState {
  levels: RoleLevel[];
  /**
   * False until the ladder is known (loaded, or remembered from this tab's earlier visit). Until then the
   * caller should show a placeholder: showing the fallback tabs first would flash the wrong ones.
   */
  isLoaded: boolean;
}

/**
 * The escalation ladder from the service. If it can't be loaded the page falls back to the ladder as it was
 * before the service published it, so the officer tabs always have something to show.
 */
export function useRoleLevels(): RoleLevelsState {
  const [state, setState] = useState<RoleLevelsState>(() => {
    const known = cached ?? (typeof window === 'undefined' ? null : readRemembered());
    return known ? { levels: known, isLoaded: true } : { levels: FALLBACK_ROLE_LEVELS, isLoaded: false };
  });

  useEffect(() => {
    let cancelled = false;
    // Even a remembered ladder is checked once per page load, so a deploy that changes it shows up.
    if (cached) return;
    load()
      .then((loaded) => {
        if (cancelled) return;
        setState(loaded.length > 0 ? { levels: loaded, isLoaded: true } : { levels: FALLBACK_ROLE_LEVELS, isLoaded: true });
      })
      .catch(() => {
        // Keep what is shown, or fall back: a failed ladder must not take the page down.
        if (!cancelled) setState((current) => ({ levels: current.levels, isLoaded: true }));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
