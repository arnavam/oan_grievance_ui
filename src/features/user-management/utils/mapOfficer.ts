import type { Officer } from '../data/officers';
import type { OfficerRecord, OfficerStatisticsRecord } from '../types';
import { avatarForName } from './avatar';

/**
 * `OfficerRecord` (profile) and `OfficerStatisticsRecord` (performance) come from two
 * separate endpoints — see `officerApi.ts` — and are joined here by user id (`name`/`user`)
 * into the `Officer` view model the existing card/modal UI already renders. `stats` is
 * `undefined` when the statistics call hasn't resolved yet or the officer has none.
 */
export function mapOfficerRecord(
  record: OfficerRecord,
  stats: OfficerStatisticsRecord | undefined,
  /**
   * What to call the officer's role: the name of the level the list was queried by. The row's own `level` is
   * a tier token that moves when a rung is inserted (the Zone rung made the department head L4).
   */
  roleTitle?: string
): Officer {
  const avatar = avatarForName(record.full_name);
  const avgTimeDays = stats?.avg_resolution_hours != null ? Math.round(stats.avg_resolution_hours / 24) : 0;

  return {
    id: record.name,
    name: record.full_name,
    status: record.status,
    roleTitle: record.role === 'Reviewer' ? 'Review Officer' : (roleTitle ?? 'Officer'),
    department: record.department || '-',
    email: record.email,
    phone: record.phone || '-',
    region: record.region_name || record.region || '-',
    regionId: record.region,
    tags: record.service_categories,
    assigned: stats?.assigned ?? 0,
    resolved: stats?.resolved ?? 0,
    avgTimeDays,
    resolutionRate: stats?.resolution_rate != null ? Math.round(stats.resolution_rate) : 0,
    avatarInitials: avatar.initials,
    avatarBg: avatar.bg,
    avatarColor: avatar.color,
    mustChangePassword: record.must_change_password,
    reportsTo: record.reports_to,
    reportsToName: record.reports_to_name,
    designation: record.designation,
  };
}
