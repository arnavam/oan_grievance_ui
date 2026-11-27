'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { useIsReviewOfficer } from '@/features/auth/hooks/useIsReviewOfficer';
import { fetchGrievanceOptionsThunk, selectCategoryFilterOptions, useAreas } from '@/features/metadata';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { buildOfficerTabs, LEGACY_TAB_IDS, REVIEWER_STATUS_OPTIONS, REVIEWER_TAB_ID, type Officer, type OfficerTabId } from '../data/officers';
import { useOfficerList } from '../hooks/useOfficerList';
import { useOfficerStatusCounts } from '../hooks/useOfficerStatusCounts';
import { useRoleLevels } from '../hooks/useRoleLevels';
import { AddNodalOfficerModal } from './AddNodalOfficerModal';
import { EditNodalOfficerModal } from './EditNodalOfficerModal';
import { OfficerCard } from './OfficerCard';
import { OfficerFiltersDrawer } from './OfficerFiltersDrawer';
import { OfficerPagination } from './OfficerPagination';
import { OfficerStatsBar } from './OfficerStatsBar';
import { OfficerTabs } from './OfficerTabs';
import { OfficerToolbar } from './OfficerToolbar';

const PAGE_SIZE = 9;

export function OfficerDirectory() {
  const dispatch = useAppDispatch();
  // A Review Officer can read the Admin/Nodal tabs here (route access — see rbac.ts), but
  // the backend refuses to even list Reviewer accounts for that role (STG-443's
  // `REVIEWER_READ_ROLES` is an admin-only set) — see this file's `visibleTabs` below — and
  // refuses every create/edit/password-reset call regardless of tab, so those controls are
  // hidden rather than left to fail with a 403 on click.
  const canManage = !useIsReviewOfficer();

  // One tab per rung of the escalation ladder the service publishes, then the Reviewer tab.
  const { levels: roleLevels, isLoaded: levelsLoaded } = useRoleLevels();
  const allTabs = useMemo(() => buildOfficerTabs(roleLevels), [roleLevels]);
  const visibleTabs = useMemo(() => (canManage ? allTabs : allTabs.filter((tab) => tab.id !== REVIEWER_TAB_ID)), [allTabs, canManage]);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Older links name the three tabs that used to be fixed (`?tab=admin`).
  const rawTab = searchParams?.get('tab');
  const tabParam = rawTab ? (LEGACY_TAB_IDS[rawTab] ?? rawTab) : rawTab;
  const isValidTab = (tab: string | null | undefined): tab is OfficerTabId =>
    Boolean(tab && visibleTabs.some((t) => t.id === tab));

  const [localTab, setLocalTab] = useState<OfficerTabId | null>(null);
  const activeTab: OfficerTabId = isValidTab(tabParam)
    ? tabParam
    : isValidTab(localTab)
      ? localTab
      : (visibleTabs[0]?.id ?? REVIEWER_TAB_ID);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<Officer | null>(null);

  const activeTabConfig = visibleTabs.find((tab) => tab.id === activeTab) ?? visibleTabs[0]!;
  const { role, level } = activeTabConfig;
  const isReviewerTab = role === 'Reviewer';

  // Metadata (department/service-category/region options) backs both this page's filters
  // and the Add/Edit officer forms.
  const grievanceOptionsStatus = useAppSelector((state) => state.metadata.grievanceOptionsStatus);
  useEffect(() => {
    if (grievanceOptionsStatus === 'idle') {
      void dispatch(fetchGrievanceOptionsThunk());
    }
  }, [dispatch, grievanceOptionsStatus]);
  const categoryOptions = useAppSelector(selectCategoryFilterOptions);
  const { areas: regionAreas } = useAreas({ level: 'Region' });

  const apiResult = useOfficerList({
    role,
    level,
    statsLevel: activeTabConfig.statsLevel,
    roleTitle: activeTabConfig.roleTitle,
    search: searchQuery,
    category: categoryFilter,
    region: regionFilter,
    status: statusFilter,
    page,
    enabled: levelsLoaded,
  });

  // The real tabs filter by the backend's stored region id, not its display name — sending
  // the name would silently match nothing, since officers are stored with the id.
  const availableRegions = [...regionAreas].sort((a, b) => a.area_name.localeCompare(b.area_name)).map((area) => ({ value: area.area_id, label: area.area_name }));
  const availableCategories = categoryOptions.map((o) => o.label).sort();

  const displayedOfficers = apiResult.officers;
  const currentPage = page;
  const totalPages = apiResult.totalPages;
  const totalCount = apiResult.totalCount;

  const apiStatusCounts = useOfficerStatusCounts(role, level, levelsLoaded);
  const stats = { active: apiStatusCounts.active, onLeave: apiStatusCounts.onLeave, inactive: apiStatusCounts.inactive };

  const activeFilterCount = [categoryFilter, regionFilter, statusFilter].filter(Boolean).length;

  const resetFilters = () => {
    setCategoryFilter('');
    setRegionFilter('');
    setStatusFilter('');
    setPage(1);
  };

  const handleTabChange = (tab: OfficerTabId) => {
    setLocalTab(tab);
    if (router && pathname) {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      params.set('tab', tab);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
    setSearchQuery('');
    resetFilters();
    setIsFiltersOpen(false);
  };

  if (!levelsLoaded) {
    return (
      <div className="flex flex-col gap-6 h-full font-sans" aria-busy="true">
        <div className="bg-white rounded-xl p-6 border border-[#F1F3F4] flex flex-col gap-5 animate-pulse">
          <div className="h-7 w-56 rounded bg-gray-100" />
          <div className="h-4 w-96 max-w-full rounded bg-gray-100" />
          <div className="h-12 rounded-xl bg-gray-100" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: PAGE_SIZE }, (_, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#F1F3F4] p-5 h-64 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full font-sans">
      <div className="bg-white rounded-xl p-6 border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] flex flex-col gap-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{activeTabConfig.label}</h1>
          <p className="text-gray-500 text-sm mt-1">{activeTabConfig.description}</p>
        </div>

        <OfficerTabs
          tabs={visibleTabs}
          activeTab={activeTab}
          onChange={handleTabChange}
          activeTotal={apiResult.isLoading ? null : totalCount}
        />

        <OfficerToolbar
          searchQuery={searchQuery}
          onSearchChange={(value) => {
            setSearchQuery(value);
            setPage(1);
          }}
          addButtonLabel={activeTabConfig.addButtonLabel}
          onAddClick={() => setIsAddOpen(true)}
          onOpenFilters={() => setIsFiltersOpen(true)}
          activeFilterCount={activeFilterCount}
          canManage={canManage}
        />

        <OfficerStatsBar active={stats.active} onLeave={stats.onLeave} inactive={stats.inactive} />
      </div>

      {apiResult.error ? (
        <div className="bg-white rounded-xl border border-red-200 p-12 flex flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-red-600 max-w-md">{apiResult.error}</p>
          <button
            type="button"
            onClick={apiResult.refetch}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      ) : apiResult.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: PAGE_SIZE }, (_, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#F1F3F4] p-5 h-64 animate-pulse" />
          ))}
        </div>
      ) : displayedOfficers.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#F1F3F4] p-12 flex items-center justify-center text-sm text-gray-500">
          No {activeTabConfig.listLabel.toLowerCase()} match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedOfficers.map((officer) => (
            <OfficerCard key={officer.id} officer={officer} onEdit={setEditingOfficer} canEdit={canManage} />
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#F1F3F4] px-5 py-4">
        <OfficerPagination
          page={currentPage}
          totalPages={totalPages}
          pageCount={displayedOfficers.length}
          totalCount={totalCount}
          listLabel={activeTabConfig.listLabel}
          onPageChange={(next) => setPage(Math.min(Math.max(1, next), totalPages))}
        />
      </div>

      <AddNodalOfficerModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        role={role}
        level={level}
        supervisorLevel={activeTabConfig.supervisorLevel}
        supervisorLabel={activeTabConfig.supervisorLabel}
        areaLevel={activeTabConfig.areaLevel}
        tabLabel={activeTabConfig.label}
        onCreated={apiResult.refetch}
      />
      <EditNodalOfficerModal
        key={editingOfficer?.id ?? 'closed'}
        isOpen={editingOfficer !== null}
        onClose={() => setEditingOfficer(null)}
        officer={editingOfficer}
        role={role}
        level={level}
        supervisorLevel={activeTabConfig.supervisorLevel}
        supervisorLabel={activeTabConfig.supervisorLabel}
        areaLevel={activeTabConfig.areaLevel}
        tabLabel={activeTabConfig.label}
        onSaved={apiResult.refetch}
      />

      <OfficerFiltersDrawer
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={(value) => {
          setCategoryFilter(value);
          setPage(1);
        }}
        availableCategories={availableCategories}
        regionFilter={regionFilter}
        onRegionFilterChange={(value) => {
          setRegionFilter(value);
          setPage(1);
        }}
        availableRegions={availableRegions}
        statusFilter={statusFilter}
        onStatusFilterChange={(value) => {
          setStatusFilter(value);
          setPage(1);
        }}
        statusOptions={isReviewerTab ? REVIEWER_STATUS_OPTIONS : undefined}
        onReset={resetFilters}
        activeFilterCount={activeFilterCount}
      />
    </div>
  );
}
