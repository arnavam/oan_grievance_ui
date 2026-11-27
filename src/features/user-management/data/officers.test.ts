import { describe, expect, it } from 'vitest';
import { buildOfficerTabs, FALLBACK_ROLE_LEVELS, LEGACY_TAB_IDS, REVIEWER_TAB_ID, tagStyleFor } from './officers';
import type { RoleLevel } from '../types';

const LADDER: RoleLevel[] = [
  { level_code: 'department_head', level_name: 'Regional Bureau Head', level_order: 30, is_active: true },
  { level_code: 'nodal_officer', level_name: 'Kebele Nodal Officer', level_order: 10, is_active: true },
  { level_code: 'review_officer', level_name: 'Review Officer', level_order: 910, is_active: false },
  { level_code: 'zonal_head', level_name: 'Zonal Head', level_order: 25, is_active: true },
  { level_code: 'senior_nodal_officer', level_name: 'Woreda Nodal Officer', level_order: 20, is_active: true },
];

describe('tagStyleFor', () => {
  it('gives the same category the same colour every time', () => {
    expect(tagStyleFor('Agricultural inputs')).toEqual(tagStyleFor('Agricultural inputs'));
  });

  it('styles any category name, including ones added after release', () => {
    for (const name of ['Livestock and veterinary', 'Land and tenure', 'A brand new category', '']) {
      const style = tagStyleFor(name);
      expect(style.bg).toMatch(/^bg-/);
      expect(style.text).toMatch(/^text-/);
      expect(style.border).toMatch(/^border-/);
    }
  });
});

describe('buildOfficerTabs', () => {
  const tabs = buildOfficerTabs(LADDER);

  it('makes one tab per active rung, junior to senior, then the Reviewer tab', () => {
    expect(tabs.map((tab) => tab.label)).toEqual([
      'Kebele Nodal Officer',
      'Woreda Nodal Officer',
      'Zonal Head',
      'Regional Bureau Head',
      'Reviewer',
    ]);
  });

  it('queries each rung by its level code, and the Reviewer tab with no level', () => {
    expect(tabs.map((tab) => [tab.role, tab.level])).toEqual([
      ['Officer', 'nodal_officer'],
      ['Officer', 'senior_nodal_officer'],
      ['Officer', 'zonal_head'],
      ['Officer', 'department_head'],
      ['Reviewer', undefined],
    ]);
    expect(tabs.at(-1)?.id).toBe(REVIEWER_TAB_ID);
  });

  it('gives statistics only to the first two rungs, which are all the statistics endpoint knows', () => {
    expect(tabs.map((tab) => tab.statsLevel)).toEqual(['L1', 'L2', undefined, undefined, undefined]);
  });

  it('places each rung at an area level counted from the top: Region, Zone, Woreda, Kebele', () => {
    expect(tabs.map((tab) => tab.areaLevel)).toEqual(['Kebele', 'Woreda', 'Zone', 'Region', undefined]);
  });

  it('lets only the first rung report to the one above it', () => {
    expect(tabs[0]).toMatchObject({ supervisorLevel: 'senior_nodal_officer', supervisorLabel: 'Woreda Nodal Officer' });
    expect(tabs.slice(1).every((tab) => tab.supervisorLevel === undefined)).toBe(true);
  });

  it('names the add button, the list and each card after the level', () => {
    expect(tabs[2]).toMatchObject({
      addButtonLabel: 'Add Zonal Head',
      listLabel: 'Zonal Heads',
      roleTitle: 'Zonal Head',
    });
  });

  it('leaves out an inactive rung and the review officer level', () => {
    const withInactive = buildOfficerTabs([...LADDER, { level_code: 'ward', level_name: 'Ward', level_order: 5, is_active: false }]);
    expect(withInactive.map((tab) => tab.id)).not.toContain('ward');
    expect(withInactive.map((tab) => tab.id)).not.toContain('review_officer');
  });

  it('still builds three working tabs from the fallback ladder', () => {
    expect(buildOfficerTabs(FALLBACK_ROLE_LEVELS).map((tab) => tab.label)).toEqual([
      'Nodal Officer',
      'Senior Nodal Officer',
      'Category Admin',
      'Reviewer',
    ]);
  });

  it('maps the old fixed tab ids to their level codes', () => {
    expect(LEGACY_TAB_IDS).toEqual({
      admin: 'department_head',
      'nodal-l1': 'nodal_officer',
      'nodal-l2': 'senior_nodal_officer',
    });
  });
});
