import type { AreaLevel } from '@/features/metadata';
import type { OfficerLevel, OfficerRole, RoleLevel } from '../types';

export type OfficerStatus = 'Active' | 'On Leave' | 'Inactive';
/** A role level code, or `reviewer`. */
export type OfficerTabId = string;

export interface Officer {
  id: string;
  name: string;
  status: OfficerStatus;
  /** Display label, derived from the officer's role and level. */
  roleTitle: string;
  department: string;
  email: string;
  phone: string;
  /** Display label — the area's name when the backend sent one, else its raw id, else `'-'`. */
  region: string;
  /**
   * The area's own id, independent of whether `region` above is a display name or (when
   * the backend omitted `region_name`) that same raw id shown as if it were one. Editing an
   * officer must seed the region picker from this, never from re-matching `region` against
   * the area list by name — that match silently fails whenever `region` already holds a raw
   * id, and used to send `region: null` on save, wiping it.
   */
  regionId: string | null;
  tags: string[];
  assigned: number;
  resolved: number;
  avgTimeDays: number;
  resolutionRate: number;
  avatarInitials: string;
  avatarBg: string;
  avatarColor: string;
  /** True while a real officer still holds an admin-issued temporary password. */
  mustChangePassword: boolean;
  /** The L1 officer's L2 supervisor (user id/email), or null. */
  reportsTo: string | null;
  /** That supervisor's name, when the service sent it. */
  reportsToName: string | null;
  /** Their designation (Crop DA, ...), or null. */
  designation: string | null;
}

export type OfficerTabIcon = 'first' | 'middle' | 'top' | 'reviewer';

export interface OfficerTabConfig {
  /** A role level code, or `reviewer`. */
  id: OfficerTabId;
  label: string;
  description: string;
  addButtonLabel: string;
  listLabel: string;
  /** What the tab queries on `GET /api/v1/officers`: a Reviewer has no level (sending one is refused). */
  role: OfficerRole;
  level?: OfficerLevel;
  /**
   * The statistics endpoint only knows L1 and L2, the first two rungs: it is the tier token of those, and
   * absent for every other tab (it refuses the rest, since they carry no first-line caseload of their own).
   */
  statsLevel?: 'L1' | 'L2';
  /** On the first rung only: the rung whose officers it can report to, for the "Reports To" field. */
  supervisorLevel?: OfficerLevel;
  supervisorLabel?: string;
  /**
   * The deepest administrative area an officer of this rung is placed at: the top rung works at Region, the
   * next down at Zone, then Woreda, then Kebele. Counted from the top of the ladder, so a rung added or
   * dropped shifts the rest. Absent for the Reviewer tab.
   */
  areaLevel?: AreaLevel;
  /** Shown on each card of the tab. */
  roleTitle: string;
  icon: OfficerTabIcon;
}

export const REVIEWER_TAB_ID = 'reviewer';
/** The top rung: a category admin takes any category, while a lower officer needs one with a desk. */
export const TOP_LEVEL_CODE = 'department_head';
const REVIEWER_LEVEL_CODE = 'review_officer';

/**
 * The ladder as it was before the service published it, used until `GET /api/v1/role-levels` answers (and
 * if it never does) so the page still has its three working tabs.
 */
export const FALLBACK_ROLE_LEVELS: RoleLevel[] = [
  { level_code: 'nodal_officer', level_name: 'Nodal Officer', level_order: 10, is_active: true },
  { level_code: 'senior_nodal_officer', level_name: 'Senior Nodal Officer', level_order: 20, is_active: true },
  { level_code: TOP_LEVEL_CODE, level_name: 'Category Admin', level_order: 30, is_active: true },
];

/** Links and bookmarks from when the tabs were fixed: `?tab=admin` and the like. */
export const LEGACY_TAB_IDS: Record<string, string> = {
  admin: TOP_LEVEL_CODE,
  'nodal-l1': 'nodal_officer',
  'nodal-l2': 'senior_nodal_officer',
};

const AREA_LEVELS_TOP_DOWN: readonly AreaLevel[] = ['Region', 'Zone', 'Woreda', 'Kebele'];

const plural = (name: string) => (name.endsWith('s') ? name : `${name}s`);

const REVIEWER_TAB: OfficerTabConfig = {
  id: REVIEWER_TAB_ID,
  label: 'Reviewer',
  description:
    'Read-only oversight accounts — can view grievances, officers, and category assignments, but cannot create, edit, or resolve anything.',
  addButtonLabel: 'Add Reviewer',
  listLabel: 'Reviewers',
  role: 'Reviewer',
  roleTitle: 'Review Officer',
  icon: 'reviewer',
};

/**
 * One tab per active rung of the escalation ladder, junior to senior, then the Reviewer tab. The ladder is
 * the service's, so a rung added there (the Zone rung) shows up here without a code change.
 */
export function buildOfficerTabs(levels: RoleLevel[]): OfficerTabConfig[] {
  const ladder = levels
    .filter((level) => level.is_active && level.level_code !== REVIEWER_LEVEL_CODE)
    .sort((a, b) => a.level_order - b.level_order);
  const rungs = ladder.map<OfficerTabConfig>((level, index) => ({
    id: level.level_code,
    label: level.level_name,
    description: `Manage ${level.level_name} accounts, the categories and area they cover, and their access.`,
    addButtonLabel: `Add ${level.level_name}`,
    listLabel: plural(level.level_name),
    role: 'Officer',
    level: level.level_code,
    statsLevel: index === 0 ? 'L1' : index === 1 ? 'L2' : undefined,
    supervisorLevel: index === 0 ? ladder[1]?.level_code : undefined,
    supervisorLabel: index === 0 ? ladder[1]?.level_name : undefined,
    areaLevel: AREA_LEVELS_TOP_DOWN[ladder.length - 1 - index],
    roleTitle: level.level_name,
    icon: index === 0 ? 'first' : index === ladder.length - 1 ? 'top' : 'middle',
  }));
  return [...rungs, REVIEWER_TAB];
}

export const STATUS_STYLES: Record<OfficerStatus, { dot: string; text: string; bg: string; border: string }> = {
  Active: { dot: 'bg-[#16A34A]', text: 'text-[#16A34A]', bg: 'bg-[#16A34A]/5', border: 'border-[#16A34A]/30' },
  'On Leave': { dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  Inactive: { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
};

type TagStyle = { bg: string; text: string; border: string };

const DEFAULT_TAG_STYLE: TagStyle = { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" };

/**
 * Colours for a category tag. Categories come from the backend and admins can add more, so the style
 * is picked from the name (the same name always gets the same colour) rather than from a fixed list.
 */
const TAG_PALETTE: TagStyle[] = [
  { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
  { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200" },
  { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" },
  { bg: "bg-teal-50", text: "text-teal-600", border: "border-teal-200" },
  { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-200" },
  { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-200" },
  { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" },
  { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-200" },
];

export function tagStyleFor(tag: string): TagStyle {
  let hash = 0;
  for (let i = 0; i < tag.length; i += 1) hash = (hash * 31 + tag.charCodeAt(i)) >>> 0;
  return TAG_PALETTE[hash % TAG_PALETTE.length] ?? DEFAULT_TAG_STYLE;
}

/** The Add/Edit forms' and the filter drawer's status dropdown for an Officer (L1/L2/L3). */
export const OFFICER_STATUS_OPTIONS: OfficerStatus[] = ['Active', 'On Leave', 'Inactive'];
/** A Reviewer has no 'On Leave' status — the backend refuses it (400). */
export const REVIEWER_STATUS_OPTIONS: OfficerStatus[] = ['Active', 'Inactive'];
