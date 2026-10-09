'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useIsReviewOfficer } from '@/features/auth/hooks/useIsReviewOfficer';
import { fetchGrievanceOptionsThunk, selectCategoryFilterOptions, useAreas } from '@/features/metadata';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { OFFICER_DIRECTORY, OFFICER_TABS, OFFICER_TABS_BY_ID, type Officer, type OfficerTabId } from '../data/officers';
import { useOfficerCount } from '../hooks/useOfficerCount';
import { useOfficerList } from '../hooks/useOfficerList';
import { useOfficerStatusCounts } from '../hooks/useOfficerStatusCounts';
import type { OfficerLevel } from '../types';
import { AddNodalOfficerModal } from './AddNodalOfficerModal';
import { AddOfficerModal } from './AddOfficerModal';
import { EditNodalOfficerModal } from './EditNodalOfficerModal';
import { EditOfficerModal } from './EditOfficerModal';
import { OfficerCard } from './OfficerCard';
import { OfficerFiltersDrawer } from './OfficerFiltersDrawer';
import { OfficerPagination } from './OfficerPagination';
import { OfficerStatsBar } from './OfficerStatsBar';
import { OfficerTabs } from './OfficerTabs';
import { OfficerToolbar } from './OfficerToolbar';

const PAGE_SIZE = 9;

function levelForTab(tab: OfficerTabId): OfficerLevel {
  return tab === 'nodal-l2' ? 'L2' : 'L1';
}

export function OfficerDirectory() {
  const dispatch = useAppDispatch();
  // A Review Officer can view every tab here (route access — see rbac.ts) but the
  // backend refuses every create/edit/password-reset call for it (PR #47, STG-434), so
  // those controls are hidden rather than left to fail with a 403 on click.
  const canManage = !useIsReviewOfficer();

  // Dummy, client-only data for the Admin tab — there is no backend API for admin
  // accounts yet, only for L1/L2 officers (see useOfficerList's doc comment).
  const [officersByTab, setOfficersByTab] = useState(OFFICER_DIRECTORY);
  const [activeTab, setActiveTab] = useState<OfficerTabId>('admin');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<Officer | null>(null);

  const isApiTab = activeTab === 'nodal-l1' || activeTab === 'nodal-l2';
  const level = levelForTab(activeTab);

  const activeTabConfig = OFFICER_TABS_BY_ID[activeTab];
  const dummyOfficers = officersByTab[activeTab];

  // Metadata (department/service-category/region options) backs both the API tabs'
  // filters and the Add/Edit officer forms.
  const grievanceOptionsStatus = useAppSelector((state) => state.metadata.grievanceOptionsStatus);
  useEffect(() => {
    if (grievanceOptionsStatus === 'idle') {
      void dispatch(fetchGrievanceOptionsThunk());
    }
  }, [dispatch, grievanceOptionsStatus]);
  const categoryOptions = useAppSelector(selectCategoryFilterOptions);
  const { areas: regionAreas } = useAreas({ level: 'Region' });

  const apiResult = useOfficerList({
    level,
    search: searchQuery,
    category: categoryFilter,
    region: regionFilter,
    status: statusFilter,
    page,
    enabled: isApiTab,
  });

  // Independent of which tab is active — a tab's `(N)` badge needs its real total even
  // before you've ever clicked into it, which `apiResult` alone can't provide (it only
  // fetches for the currently active tab).
  const l1Count = useOfficerCount('L1');
  const l2Count = useOfficerCount('L2');

  const dummyAvailableRegions = useMemo(
    () => Array.from(new Set(dummyOfficers.map((officer) => officer.region))).sort(),
    [dummyOfficers]
  );
  const dummyAvailableCategories = useMemo(
    () => Array.from(new Set(dummyOfficers.flatMap((officer) => officer.tags))).sort(),
    [dummyOfficers]
  );
  // The real tabs filter by the backend's stored region id, not its display name — sending
  // the name (as the Add/Edit forms' own region id resolution already shows elsewhere)
  // would silently match nothing, since officers are stored with the id.
  const availableRegions = isApiTab
    ? [...regionAreas].sort((a, b) => a.area_name.localeCompare(b.area_name)).map((area) => ({ value: area.area_id, label: area.area_name }))
    : dummyAvailableRegions;
  const availableCategories = isApiTab ? categoryOptions.map((o) => o.label).sort() : dummyAvailableCategories;

  const filteredDummyOfficers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return dummyOfficers.filter((officer) => {
      const matchesQuery =
        !query ||
        officer.name.toLowerCase().includes(query) ||
        officer.email.toLowerCase().includes(query) ||
        officer.roleTitle.toLowerCase().includes(query) ||
        officer.department.toLowerCase().includes(query);
      const matchesCategory = !categoryFilter || officer.tags.includes(categoryFilter);
      const matchesStatus = !statusFilter || officer.status === statusFilter;
      const matchesRegion = !regionFilter || officer.region === regionFilter;
      return matchesQuery && matchesCategory && matchesStatus && matchesRegion;
    });
  }, [dummyOfficers, searchQuery, categoryFilter, statusFilter, regionFilter]);

  const dummyTotalPages = Math.max(1, Math.ceil(filteredDummyOfficers.length / PAGE_SIZE));
  const dummyCurrentPage = Math.min(page, dummyTotalPages);
  const dummyStartIndex = (dummyCurrentPage - 1) * PAGE_SIZE;
  const paginatedDummyOfficers = filteredDummyOfficers.slice(dummyStartIndex, dummyStartIndex + PAGE_SIZE);

  const displayedOfficers = isApiTab ? apiResult.officers : paginatedDummyOfficers;
  const currentPage = isApiTab ? page : dummyCurrentPage;
  const totalPages = isApiTab ? apiResult.totalPages : dummyTotalPages;
  const totalCount = isApiTab ? apiResult.totalCount : filteredDummyOfficers.length;

  // The API tabs' breakdown comes from three separate total-count-only requests (below) so
  // it covers every officer at this level, not just the current page's rows. The Admin tab
  // has no backend equivalent, so it still counts its full (client-held) dummy dataset.
  const apiStatusCounts = useOfficerStatusCounts(level, isApiTab);
  const dummyStats = useMemo(
    () => ({
      active: dummyOfficers.filter((officer) => officer.status === 'Active').length,
      onLeave: dummyOfficers.filter((officer) => officer.status === 'On Leave').length,
      inactive: dummyOfficers.filter((officer) => officer.status === 'Inactive').length,
    }),
    [dummyOfficers]
  );
  const stats = isApiTab
    ? { active: apiStatusCounts.active, onLeave: apiStatusCounts.onLeave, inactive: apiStatusCounts.inactive }
    : dummyStats;

  const activeFilterCount = [categoryFilter, regionFilter, statusFilter].filter(Boolean).length;

  const resetFilters = () => {
    setCategoryFilter('');
    setRegionFilter('');
    setStatusFilter('');
    setPage(1);
  };

  const handleTabChange = (tab: OfficerTabId) => {
    setActiveTab(tab);
    setSearchQuery('');
    resetFilters();
    setIsFiltersOpen(false);
  };

  const handleAddDummyOfficer = (officer: Officer) => {
    setOfficersByTab((prev) => ({
      ...prev,
      [activeTab]: [officer, ...prev[activeTab]],
    }));
    setPage(1);
  };

  const handleUpdateDummyOfficer = (updated: Officer) => {
    setOfficersByTab((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab].map((officer) => (officer.id === updated.id ? updated : officer)),
    }));
    setEditingOfficer(null);
  };

  return (
    <div className="flex flex-col gap-6 h-full font-sans">
      <div className="bg-white rounded-xl p-6 border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] flex flex-col gap-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{activeTabConfig.label}</h1>
          <p className="text-gray-500 text-sm mt-1">{activeTabConfig.description}</p>
        </div>

        <OfficerTabs
          tabs={OFFICER_TABS}
          activeTab={activeTab}
          onChange={handleTabChange}
          counts={{
            admin: officersByTab.admin.length,
            reviewer: officersByTab.reviewer.length,
            'nodal-l1': activeTab === 'nodal-l1' && !apiResult.isLoading ? totalCount : l1Count,
            'nodal-l2': activeTab === 'nodal-l2' && !apiResult.isLoading ? totalCount : l2Count,
          }}
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

      {isApiTab && apiResult.error ? (
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
      ) : isApiTab && apiResult.isLoading ? (
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

      {isApiTab ? (
        <>
          <AddNodalOfficerModal
            isOpen={isAddOpen}
            onClose={() => setIsAddOpen(false)}
            level={level}
            tabLabel={activeTabConfig.label}
            onCreated={apiResult.refetch}
          />
          <EditNodalOfficerModal
            key={editingOfficer?.id ?? 'closed'}
            isOpen={editingOfficer !== null}
            onClose={() => setEditingOfficer(null)}
            officer={editingOfficer}
            level={level}
            onSaved={apiResult.refetch}
          />
        </>
      ) : (
        <>
          <AddOfficerModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} tabLabel={activeTabConfig.label} onAdd={handleAddDummyOfficer} />
          <EditOfficerModal
            key={editingOfficer?.id ?? 'closed'}
            isOpen={editingOfficer !== null}
            onClose={() => setEditingOfficer(null)}
            officer={editingOfficer}
            onSave={handleUpdateDummyOfficer}
          />
        </>
      )}

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
        onReset={resetFilters}
        activeFilterCount={activeFilterCount}
      />
    </div>
  );
}
