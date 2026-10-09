"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { canViewAllGrievances } from '@/features/auth/rbac';
import {
  fetchGrievanceOptionsThunk,
  selectCategoryFilterOptions,
  selectStatusFilterOptions,
} from '@/features/metadata';
import { TopHeader } from './components/TopHeader';
import { MetricCardsComponent } from './components/MetricCardsComponent';
import { GrievanceTable } from './components/GrievanceTable';
import { AdvancedFiltersSidebar } from './components/AdvancedFiltersSidebar';
import { GrievanceDetailSidebar } from './detail-sidebar-panel/page';
import { useGrievanceList } from './hooks/useGrievanceList';
import { useGrievanceMetrics } from './hooks/useGrievanceMetrics';
import { EMPTY_GRIEVANCE_FILTERS, type Grievance, type GrievanceFilters } from './types';

export default function AllGrievancesPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<GrievanceFilters>({ ...EMPTY_GRIEVANCE_FILTERS });

  // Read pagination state from URL search params so reloads and shared links preserve the page
  const pageParam = searchParams.get('page');
  const parsedPage = pageParam ? parseInt(pageParam, 10) : 1;
  const currentPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const pageSizeParam = searchParams.get('pageSize') || searchParams.get('page_size');
  const parsedPageSize = pageSizeParam ? parseInt(pageSizeParam, 10) : 10;
  const rowsPerPage = [10, 20, 50].includes(parsedPageSize) ? parsedPageSize : 10;

  const setCurrentPage = useCallback(
    (pageOrFn: number | ((prev: number) => number), replace = false) => {
      const targetPage = typeof pageOrFn === 'function' ? pageOrFn(currentPage) : pageOrFn;
      if (targetPage === currentPage && searchParams.get('page') === String(targetPage)) return;

      const params = new URLSearchParams(searchParams.toString());
      if (targetPage <= 1) {
        params.set('page', '1');
      } else {
        params.set('page', String(targetPage));
      }

      const queryString = params.toString();
      const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;
      if (replace) {
        router.replace(targetUrl, { scroll: false });
      } else {
        router.push(targetUrl, { scroll: false });
      }
    },
    [currentPage, pathname, router, searchParams]
  );

  const setRowsPerPage = useCallback(
    (rows: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (rows === 10) {
        params.delete('pageSize');
        params.delete('page_size');
      } else {
        params.set('pageSize', String(rows));
      }
      params.set('page', '1');

      const queryString = params.toString();
      const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.push(targetUrl, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // Reference data for the status/category filters comes from GET /api/v1/grievances/options;
  // the area filters load their own options (see AreaFilterDropdown).
  const optionsStatus = useAppSelector((state) => state.metadata.grievanceOptionsStatus);
  const statusOptions = useAppSelector(selectStatusFilterOptions);
  const categoryOptions = useAppSelector(selectCategoryFilterOptions);

  useEffect(() => {
    if (optionsStatus === 'idle') void dispatch(fetchGrievanceOptionsThunk());
  }, [dispatch, optionsStatus]);

  const { grievances, totalItems, totalPages, isLoading, error, refetch } = useGrievanceList({
    filters,
    search: searchTerm,
    page: currentPage,
    pageSize: rowsPerPage,
  });

  const {
    cards,
    totalCount,
    isLoading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics,
  } = useGrievanceMetrics();
  const metricsPending = metricsLoading && cards.length === 0;

  // Reset to page 1 whenever the query changes (search term or filters),
  // so pagination cannot point past the end of a narrowed result set.
  const prevQueryRef = useRef({ searchTerm, filters });
  useEffect(() => {
    const prev = prevQueryRef.current;
    if (prev.searchTerm !== searchTerm || prev.filters !== filters) {
      prevQueryRef.current = { searchTerm, filters };
      if (currentPage !== 1) {
        setCurrentPage(1, true);
      }
    }
  }, [searchTerm, filters, currentPage, setCurrentPage]);

  // If currentPage is beyond totalPages (e.g. records deleted or high page in URL),
  // clamp it back to totalPages.
  useEffect(() => {
    if (!isLoading && totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages, true);
    }
  }, [isLoading, totalPages, currentPage, setCurrentPage]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilters({ ...EMPTY_GRIEVANCE_FILTERS });
    if (currentPage !== 1) {
      setCurrentPage(1, true);
    }
  };

  const user = useAppSelector((state) => state.auth.user);
  const userRoles = user?.roles ?? [];
  const pageTitle = canViewAllGrievances(userRoles) ? 'All Grievances' : 'My Grievances';

  return (
    <div className="flex flex-col gap-6 h-full font-sans">
      <TopHeader
        title={pageTitle}
        totalCount={totalCount}
        summaryLoading={metricsPending}
        summaryUnavailable={Boolean(metricsError)}
      />
      <MetricCardsComponent
        cards={cards}
        isLoading={metricsLoading}
        error={metricsError}
        onRetry={refetchMetrics}
      />
      <GrievanceTable
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        rowsPerPage={rowsPerPage}
        setRowsPerPage={setRowsPerPage}
        totalItems={totalItems}
        totalPages={totalPages}
        grievances={grievances}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        onOpenAdvancedFilters={() => setIsAdvancedFiltersOpen(true)}
        statusOptions={statusOptions}
        categoryOptions={categoryOptions}
        selectedStatuses={filters.status}
        setSelectedStatuses={(status) => setFilters((f) => ({ ...f, status }))}
        selectedCategories={filters.category}
        setSelectedCategories={(category) => setFilters((f) => ({ ...f, category }))}
        onClearFilters={handleClearFilters}
        onViewGrievance={setSelectedGrievance}
      />

      <AdvancedFiltersSidebar
        isOpen={isAdvancedFiltersOpen}
        onClose={() => setIsAdvancedFiltersOpen(false)}
        filters={filters}
        setFilters={setFilters}
      />

      <GrievanceDetailSidebar
        ticketNumber={selectedGrievance?.ticketNumber ?? selectedGrievance?.ticketId ?? null}
        grievance={selectedGrievance}
        onClose={() => setSelectedGrievance(null)}
      />
    </div>
  );
}
