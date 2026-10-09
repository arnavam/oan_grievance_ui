export type OfficerStatus = 'Active' | 'On Leave' | 'Inactive';
export type OfficerTabId = 'admin' | 'nodal-l1' | 'nodal-l2' | 'reviewer';

export interface Officer {
  id: string;
  name: string;
  status: OfficerStatus;
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
   * id, and used to send `region: null` on save, wiping it. Always null for dummy data.
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
  /** True while a real officer still holds an admin-issued temporary password. Always false for dummy data. */
  mustChangePassword: boolean;
  /** The L1 officer's L2 supervisor (user id/email), or null. Always null for dummy data. */
  reportsTo: string | null;
}

export interface OfficerTabConfig {
  id: OfficerTabId;
  label: string;
  description: string;
  addButtonLabel: string;
  listLabel: string;
}

export const OFFICER_TABS: OfficerTabConfig[] = [
  {
    id: 'admin',
    label: 'Admin',
    description: 'Manage administrators, roles, and access permissions in one place.',
    addButtonLabel: 'Add Admin',
    listLabel: 'Admins',
  },
  {
    id: 'nodal-l1',
    label: 'Nodal Officers (L1)',
    description: 'Manage first-level nodal officers handling grievances across woredas and regions.',
    addButtonLabel: 'Add Nodal Officer',
    listLabel: 'Nodal Officers',
  },
  {
    id: 'nodal-l2',
    label: 'Senior Nodal Officers (L2)',
    description: 'Manage senior nodal officers overseeing escalations and regional reviews.',
    addButtonLabel: 'Add Senior Nodal Officer',
    listLabel: 'Senior Nodal Officers',
  },
  {
    id: 'reviewer',
    label: 'Reviewer',
    description: 'Read-only oversight accounts — can view grievances, officers, and category assignments, but cannot create, edit, or resolve anything.',
    addButtonLabel: 'Add Reviewer',
    listLabel: 'Reviewers',
  },
];

/** `OFFICER_TABS` keyed by id, for an exhaustively-typed O(1) lookup instead of `.find()!`. */
export const OFFICER_TABS_BY_ID: Record<OfficerTabId, OfficerTabConfig> = Object.fromEntries(
  OFFICER_TABS.map((tab) => [tab.id, tab])
) as Record<OfficerTabId, OfficerTabConfig>;

export const STATUS_STYLES: Record<OfficerStatus, { dot: string; text: string; bg: string; border: string }> = {
  Active: { dot: 'bg-[#16A34A]', text: 'text-[#16A34A]', bg: 'bg-[#16A34A]/5', border: 'border-[#16A34A]/30' },
  'On Leave': { dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  Inactive: { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
};

export const TAG_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Inputs: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  Markets: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  Payments: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  Credit: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200' },
  Schemes: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
};

export const DEFAULT_TAG_STYLE = { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' };

const AVATAR_PALETTE = [
  { bg: 'bg-[#d1fae5]', color: 'text-[#065f46]' },
  { bg: 'bg-blue-100', color: 'text-blue-700' },
  { bg: 'bg-orange-100', color: 'text-orange-700' },
  { bg: 'bg-purple-100', color: 'text-purple-700' },
  { bg: 'bg-pink-100', color: 'text-pink-700' },
  { bg: 'bg-yellow-100', color: 'text-yellow-700' },
  { bg: 'bg-teal-100', color: 'text-teal-700' },
  { bg: 'bg-red-100', color: 'text-red-700' },
  { bg: 'bg-gray-100', color: 'text-gray-700' },
];

function initialsOf(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface OfficerTemplate {
  roleTitle: string;
  department: string;
  tags: string[];
  emailDomain: string;
}

const FIRST_NAMES = [
  'Abel', 'Almaz', 'Bethlehem', 'Daniel', 'Eyob', 'Girma', 'Hiwot', 'Kalkidan', 'Meron', 'Mulugeta',
  'Nardos', 'Rahel', 'Sara', 'Solomon', 'Tewodros', 'Tsion', 'Yonas', 'Yordanos', 'Zinash', 'Alemnesh',
];
const LAST_NAMES = [
  'Abera', 'Belay', 'Dereje', 'Desta', 'Gebre', 'Hailu', 'Mekonnen', 'Mulugeta', 'Tilahun', 'Wolde',
  'Asfaw', 'Negash', 'Shiferaw', 'Teshome', 'Yimer', 'Zewdu', 'Chernet', 'Fikre', 'Lemma', 'Birhanu',
];
const REGIONS = [
  'Oromia', 'Amhara', 'Tigray', 'Somali', 'Sidama', 'Harari', 'Addis Ababa',
  'SNNPR', 'Afar', 'Benishangul-Gumuz', 'Gambela', 'Dire Dawa',
];

function pad2(n: number) {
  return n.toString().padStart(2, '0');
}
function pad3(n: number) {
  return n.toString().padStart(3, '0');
}

// Deterministic by seed (never Math.random) so SSR and client hydration agree.
function makePhone(seed: number): string {
  const a = 10 + (seed % 90);
  const b = 100 + ((seed * 37) % 900);
  const c = 100 + ((seed * 53 + 7) % 900);
  return `+251 9${pad2(a)} ${pad3(b)} ${pad3(c)}`;
}

function makeStats(seed: number) {
  const assigned = 12 + ((seed * 11) % 48);
  const resolved = Math.max(0, assigned - ((seed * 7) % 16));
  const avgTimeDays = 6 + ((seed * 3) % 11);
  const resolutionRate = assigned === 0 ? 0 : Math.round((resolved / assigned) * 100);
  return { assigned, resolved, avgTimeDays, resolutionRate };
}

function buildOfficer(seed: number, template: OfficerTemplate, status: OfficerStatus, idPrefix: string): Officer {
  const first = FIRST_NAMES[seed % FIRST_NAMES.length]!;
  const last = LAST_NAMES[(seed * 3 + 2) % LAST_NAMES.length]!;
  const name = `${first} ${last}`;
  const region = REGIONS[(seed * 5 + 1) % REGIONS.length]!;
  const palette = AVATAR_PALETTE[seed % AVATAR_PALETTE.length]!;
  const { assigned, resolved, avgTimeDays, resolutionRate } = makeStats(seed);

  return {
    id: `${idPrefix}-${seed}`,
    name,
    status,
    roleTitle: template.roleTitle,
    department: template.department,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@${template.emailDomain}`,
    phone: makePhone(seed),
    region,
    regionId: null,
    tags: template.tags,
    assigned,
    resolved,
    avgTimeDays,
    resolutionRate,
    avatarInitials: initialsOf(name),
    avatarBg: palette.bg,
    avatarColor: palette.color,
    mustChangePassword: false,
    reportsTo: null,
  };
}

const ADMIN_TEMPLATES: OfficerTemplate[] = [
  { roleTitle: 'Inputs Quality Grievance Officer', department: 'Inputs Supply & Distribution Agency', tags: ['Inputs'], emailDomain: 'isda.gov.et' },
  { roleTitle: 'Market Grievance Coordinator', department: 'Market Development & Trade Bureau', tags: ['Markets'], emailDomain: 'mdtb.gov.et' },
  { roleTitle: 'Agricultural Credit Officer', department: 'Agricultural Credit Institute (AFI)', tags: ['Inputs', 'Payments'], emailDomain: 'afi.gov.et' },
  { roleTitle: 'Schemes & Extension Officer', department: 'Ministry of Agriculture (MoA)', tags: ['Schemes'], emailDomain: 'moa.gov.et' },
  { roleTitle: 'Cooperative Payments Officer', department: 'Cooperative Promotion Agency', tags: ['Payments', 'Markets'], emailDomain: 'cpa.gov.et' },
  { roleTitle: 'Finance Grievance Analyst', department: 'Agricultural Finance Institute (AFI)', tags: ['Credit'], emailDomain: 'afi.gov.et' },
  { roleTitle: 'Agricultural Extension Officer', department: 'Regional Agriculture Bureau', tags: ['Inputs'], emailDomain: 'rab.gov.et' },
  { roleTitle: 'Credit Assessment Officer', department: 'Credit Bank of Oromia', tags: ['Credit'], emailDomain: 'cbo.gov.et' },
  { roleTitle: 'Market Liaison Officer', department: 'Ethiopian Commodity Exchange', tags: ['Markets'], emailDomain: 'ece.gov.et' },
];

interface AdminSeed {
  name: string;
  status: OfficerStatus;
  region: string;
  phone: string;
  email: string;
  assigned: number;
  resolved: number;
  avgTimeDays: number;
}

const ADMIN_SEED: AdminSeed[] = [
  { name: 'Tigist Alemu', status: 'Active', region: 'Oromia', phone: '+251 911 234 567', email: 'tigist.alemu@isda.gov.et', assigned: 48, resolved: 39, avgTimeDays: 11 },
  { name: 'Dawit Haile', status: 'Active', region: 'Tigray', phone: '+251 912 345 678', email: 'dawit.haile@mdtb.gov.et', assigned: 36, resolved: 28, avgTimeDays: 13 },
  { name: 'Selam Bekele', status: 'Active', region: 'Sidama', phone: '+251 913 456 789', email: 'selam.bekele@afi.gov.et', assigned: 22, resolved: 19, avgTimeDays: 9 },
  { name: 'Hana Girma', status: 'Active', region: 'Amhara', phone: '+251 914 567 890', email: 'hana.girma@moa.gov.et', assigned: 31, resolved: 24, avgTimeDays: 12 },
  { name: 'Lemma Kassa', status: 'On Leave', region: 'Somali', phone: '+251 915 678 901', email: 'lemma.kassa@cpa.gov.et', assigned: 17, resolved: 12, avgTimeDays: 15 },
  { name: 'Biruk Tesfaye', status: 'Active', region: 'Oromia', phone: '+251 916 789 012', email: 'biruk.tesfaye@afi.gov.et', assigned: 19, resolved: 14, avgTimeDays: 11 },
  { name: 'Abebe Kebede', status: 'Active', region: 'Amhara', phone: '+251 917 345 678', email: 'abebe.kebede@rab.gov.et', assigned: 42, resolved: 35, avgTimeDays: 10 },
  { name: 'Fatuma Ahmed', status: 'Active', region: 'Harari', phone: '+251 918 456 789', email: 'fatuma.ahmed@cbo.gov.et', assigned: 55, resolved: 48, avgTimeDays: 8 },
  { name: 'Getachew Tadesse', status: 'Active', region: 'Addis Ababa', phone: '+251 919 567 890', email: 'getachew.t@ece.gov.et', assigned: 38, resolved: 30, avgTimeDays: 12 },
];

const adminSeedOfficers: Officer[] = ADMIN_SEED.map((seed, i) => {
  const template = ADMIN_TEMPLATES[i]!;
  const palette = AVATAR_PALETTE[i % AVATAR_PALETTE.length]!;
  return {
    id: `admin-${i}`,
    name: seed.name,
    status: seed.status,
    roleTitle: template.roleTitle,
    department: template.department,
    email: seed.email,
    phone: seed.phone,
    region: seed.region,
    regionId: null,
    tags: template.tags,
    assigned: seed.assigned,
    resolved: seed.resolved,
    avgTimeDays: seed.avgTimeDays,
    resolutionRate: Math.round((seed.resolved / seed.assigned) * 100),
    avatarInitials: initialsOf(seed.name),
    avatarBg: palette.bg,
    avatarColor: palette.color,
    mustChangePassword: false,
    reportsTo: null,
  };
});

// 20 Active / 5 On Leave / 5 Inactive overall, minus the 8 Active + 1 On Leave already seeded above.
const ADMIN_EXTRA_STATUSES: OfficerStatus[] = [
  'Active', 'Active', 'Inactive', 'Active', 'On Leave', 'Active', 'Active', 'Inactive', 'Active', 'On Leave',
  'Active', 'Active', 'Inactive', 'Active', 'On Leave', 'Active', 'Active', 'Inactive', 'Active', 'On Leave', 'Inactive',
];

const adminExtraOfficers: Officer[] = ADMIN_EXTRA_STATUSES.map((status, i) =>
  buildOfficer(i + 100, ADMIN_TEMPLATES[(i + 2) % ADMIN_TEMPLATES.length]!, status, 'admin-extra')
);

export const ADMIN_OFFICERS: Officer[] = [...adminSeedOfficers, ...adminExtraOfficers];

const NODAL_L1_TEMPLATES: OfficerTemplate[] = [
  { roleTitle: 'Woreda Grievance Officer', department: 'Woreda Agriculture Office', tags: ['Inputs'], emailDomain: 'wao.gov.et' },
  { roleTitle: 'Kebele Liaison Officer', department: 'Kebele Administration', tags: ['Schemes'], emailDomain: 'kebele.gov.et' },
  { roleTitle: 'Field Grievance Officer', department: 'Zonal Agriculture Department', tags: ['Markets'], emailDomain: 'zad.gov.et' },
  { roleTitle: 'Cooperative Liaison Officer', department: 'Woreda Cooperative Office', tags: ['Payments'], emailDomain: 'wco.gov.et' },
  { roleTitle: 'Credit Outreach Officer', department: 'District Microfinance Unit', tags: ['Credit'], emailDomain: 'dmu.gov.et' },
  { roleTitle: 'Extension Liaison Officer', department: 'Woreda Extension Office', tags: ['Schemes', 'Inputs'], emailDomain: 'weo.gov.et' },
];

function statusForIndex(i: number): OfficerStatus {
  if (i % 9 === 0) return 'Inactive';
  if (i % 5 === 0) return 'On Leave';
  return 'Active';
}

export const NODAL_L1_OFFICERS: Officer[] = Array.from({ length: 112 }, (_, i) =>
  buildOfficer(i + 1, NODAL_L1_TEMPLATES[i % NODAL_L1_TEMPLATES.length]!, statusForIndex(i), 'nodal-l1')
);

const NODAL_L2_TEMPLATES: OfficerTemplate[] = [
  { roleTitle: 'Senior Regional Grievance Officer', department: 'Regional Agriculture Bureau', tags: ['Inputs', 'Schemes'], emailDomain: 'rab.gov.et' },
  { roleTitle: 'Senior Market Oversight Officer', department: 'Regional Trade Bureau', tags: ['Markets'], emailDomain: 'rtb.gov.et' },
  { roleTitle: 'Senior Credit Review Officer', department: 'Regional Finance Institute', tags: ['Credit', 'Payments'], emailDomain: 'rfi.gov.et' },
  { roleTitle: 'Senior Cooperative Escalations Officer', department: 'Regional Cooperative Agency', tags: ['Payments'], emailDomain: 'rca.gov.et' },
];

export const NODAL_L2_OFFICERS: Officer[] = Array.from({ length: 48 }, (_, i) =>
  buildOfficer(i + 201, NODAL_L2_TEMPLATES[i % NODAL_L2_TEMPLATES.length]!, statusForIndex(i + 3), 'nodal-l2')
);

const REVIEWER_TEMPLATES: OfficerTemplate[] = [
  { roleTitle: 'Grievance Review Officer', department: 'Office of the Inspector General', tags: [], emailDomain: 'oig.gov.et' },
  { roleTitle: 'Compliance Reviewer', department: 'Internal Audit & Compliance Unit', tags: [], emailDomain: 'iacu.gov.et' },
  { roleTitle: 'Oversight Analyst', department: 'Ministry of Agriculture (MoA)', tags: [], emailDomain: 'moa.gov.et' },
];

// Read-only: no service categories, no assigned/resolved caseload of its own — it reads
// everyone else's, never carries any (buildOfficer's stats are zeroed out below instead).
export const REVIEWER_OFFICERS: Officer[] = Array.from({ length: 16 }, (_, i) => ({
  ...buildOfficer(i + 301, REVIEWER_TEMPLATES[i % REVIEWER_TEMPLATES.length]!, statusForIndex(i + 1), 'reviewer'),
  assigned: 0,
  resolved: 0,
  avgTimeDays: 0,
  resolutionRate: 0,
}));

export const OFFICER_DIRECTORY: Record<OfficerTabId, Officer[]> = {
  admin: ADMIN_OFFICERS,
  'nodal-l1': NODAL_L1_OFFICERS,
  'nodal-l2': NODAL_L2_OFFICERS,
  reviewer: REVIEWER_OFFICERS,
};
