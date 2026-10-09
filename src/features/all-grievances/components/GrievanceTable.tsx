import React from 'react';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  ArrowUpCircle,
  SlidersHorizontal,
  FileQuestion,
  Loader2,
  AlertCircle,
  X
} from 'lucide-react';
import type { Grievance } from '../types';
import type { FilterOption } from './FilterDropdown';

/**
 * Lifecycle statuses are configured backend-side, so this map is keyed by the labels we
 * expect and falls back to neutral styling for anything new.
 */
const statusColors: Record<string, string> = {
  'Assigned': 'bg-blue-50 text-blue-600 border border-blue-200/60',
  'Submitted': 'bg-slate-50 text-slate-600 border border-slate-200/60',
  'Pending Submit': 'bg-amber-50 text-amber-700 border border-amber-200/60',
  'In Progress': 'bg-indigo-50 text-indigo-600 border border-indigo-200/60',
  'Under Investigation': 'bg-indigo-50 text-indigo-600 border border-indigo-200/60',
  'More Info Needed': 'bg-orange-50 text-orange-700 border border-orange-200/60',
  'Resolved': 'bg-emerald-50 text-emerald-600 border border-emerald-200/60',
  'Closed': 'bg-emerald-50 text-emerald-600 border border-emerald-200/60',
  'Rejected': 'bg-red-50 text-red-600 border border-red-200/60',
  'Under Review': 'bg-purple-50 text-purple-600 border border-purple-200/60',
};

function renderSubmittedAt(submittedAt?: string | null) {
  if (!submittedAt) {
    return <span className="text-gray-400 text-xs">—</span>;
  }
  const lastCommaIndex = submittedAt.lastIndexOf(',');
  if (lastCommaIndex !== -1) {
    const datePart = submittedAt.slice(0, lastCommaIndex).trim();
    const timePart = submittedAt.slice(lastCommaIndex + 1).trim();
    return (
      <div className="flex flex-col text-xs leading-tight">
        <span className="font-medium text-gray-700">{datePart}</span>
        {timePart ? <span className="text-gray-400 text-[11px] mt-0.5">{timePart}</span> : null}
      </div>
    );
  }
  return <span className="text-xs text-gray-600 leading-tight">{submittedAt}</span>;
}

export function GrievanceTable({
  searchTerm,
  setSearchTerm,
  currentPage,
  setCurrentPage,
  rowsPerPage,
  setRowsPerPage,
  totalItems,
  totalPages,
  grievances,
  isLoading,
  error,
  onRetry,
  onOpenAdvancedFilters,
  statusOptions,
  categoryOptions,
  selectedStatuses,
  setSelectedStatuses,
  selectedCategories,
  setSelectedCategories,
  onClearFilters,
  onViewGrievance
}: {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  rowsPerPage: number;
  setRowsPerPage: (rows: number) => void;
  totalItems: number;
  totalPages: number;
  grievances: Grievance[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onOpenAdvancedFilters: () => void;
  statusOptions: FilterOption[];
  categoryOptions: FilterOption[];
  selectedStatuses: string[];
  setSelectedStatuses: (values: string[]) => void;
  selectedCategories: string[];
  setSelectedCategories: (values: string[]) => void;
  onClearFilters: () => void;
  onViewGrievance: (grievance: Grievance) => void;
}) {
  const [openFilter, setOpenFilter] = React.useState<string | null>(null);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const rangeStart = totalItems === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const rangeEnd = Math.min(currentPage * rowsPerPage, totalItems);

  return (
    <div className="bg-white flex flex-col flex-1 overflow-hidden border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 rounded-xl">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-center p-4 border-b border-gray-200 gap-4">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-gray-800 text-base">Grievance Records</h2>
          <span className="text-xs text-gray-500 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-full">
            Showing {rangeStart}-{rangeEnd} of {totalItems}
          </span>
          {isLoading && <Loader2 className="h-4 w-4 text-emerald-500 animate-spin" />}
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by ticket ID, submitter, or grievance type..."
              className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <button
            onClick={onOpenAdvancedFilters}
            className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 whitespace-nowrap transition-colors"
          >
            <SlidersHorizontal className="h-4 w-4 text-gray-500" />
            Advanced Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto flex-1 [scrollbar-color:#16A34A_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#16A34A] [&::-webkit-scrollbar-thumb]:rounded-full">
        <table className="w-full text-sm text-left table-fixed min-w-[700px]">
          <colgroup>
            <col className="w-[12%]" />
            <col className="w-[28%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[12%]" />
            <col className="w-[11%]" />
            <col className="w-[9%]" />
          </colgroup>
          <thead className="text-xs sm:text-sm text-slate-500 bg-[#F8F9FA] border-b border-gray-200 font-semibold">
            <tr>
              <th className="px-3.5 py-3 whitespace-nowrap">Ticket ID</th>
              <th className="px-3.5 py-3">Details</th>
              <th className="px-3.5 py-3">Location</th>
              <th className="px-3.5 py-3 cursor-pointer hover:text-gray-700 relative">
                <div className="flex items-center gap-1 group" onClick={() => setOpenFilter(openFilter === 'category' ? null : 'category')}>
                  <span>Category</span>
                  <Filter className={`h-3.5 w-3.5 shrink-0 transition-colors duration-300 ${openFilter === 'category' ? 'text-emerald-500' : 'text-gray-400 group-hover:text-emerald-500'}`} />
                </div>
                <FilterPopup
                  options={categoryOptions}
                  selected={selectedCategories}
                  onChange={setSelectedCategories}
                  isOpen={openFilter === 'category'}
                  onClose={() => setOpenFilter(null)}
                />
              </th>
              <th className="px-3.5 py-3 cursor-pointer hover:text-gray-700 relative">
                <div className="flex items-center gap-1 group" onClick={() => setOpenFilter(openFilter === 'status' ? null : 'status')}>
                  <span>Status</span>
                  <Filter className={`h-3.5 w-3.5 shrink-0 transition-colors duration-300 ${openFilter === 'status' ? 'text-emerald-500' : 'text-gray-400 group-hover:text-emerald-500'}`} />
                </div>
                <FilterPopup
                  options={statusOptions}
                  selected={selectedStatuses}
                  onChange={setSelectedStatuses}
                  isOpen={openFilter === 'status'}
                  onClose={() => setOpenFilter(null)}
                />
              </th>
              <th className="px-3.5 py-3">Submitted</th>
              <th className="px-3.5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {error ? (
              <tr>
                <td colSpan={7} className="px-6 py-24 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center">
                    <div className="bg-red-50 p-5 rounded-full flex items-center justify-center text-red-500 mb-6">
                      <AlertCircle className="h-10 w-10" />
                    </div>
                    <p className="text-lg font-semibold text-gray-900">Could not load grievances</p>
                    <p className="text-sm text-gray-500 mt-2 max-w-md text-center leading-relaxed">{error}</p>
                    <button
                      onClick={onRetry}
                      className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all hover:shadow-sm"
                    >
                      Try again
                    </button>
                  </div>
                </td>
              </tr>
            ) : isLoading && grievances.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="animate-pulse">
                  {Array.from({ length: 7 }).map((__, cell) => (
                    <td key={cell} className="px-3.5 py-4">
                      <div className="h-3 bg-gray-100 rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : grievances.length > 0 ? (
              grievances.map((grievance: Grievance) => (
                <tr key={grievance.id} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="px-3.5 py-4 font-semibold text-gray-900 text-xs sm:text-sm">
                    <span className="truncate block font-mono sm:font-sans" title={grievance.ticketId}>
                      {grievance.ticketId}
                    </span>
                  </td>
                  <td className="px-3.5 py-4">
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="font-semibold text-gray-900 text-sm line-clamp-2 leading-snug break-words" title={grievance.title}>
                        {grievance.title}
                      </span>
                      {grievance.type && (
                        <span className="text-gray-500 text-xs line-clamp-1 break-words" title={grievance.type}>
                          {grievance.type}
                        </span>
                      )}
                      {grievance.escalated && (
                        <div className="flex items-center gap-1.5 text-orange-600 text-xs mt-0.5 font-medium">
                          <ArrowUpCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>Escalated</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3.5 py-4 text-gray-700 font-medium text-xs sm:text-sm leading-snug">
                    <span className="line-clamp-2 break-words" title={grievance.location || undefined}>
                      {grievance.location || '—'}
                    </span>
                  </td>
                  <td className="px-3.5 py-4 text-gray-700 font-medium text-xs sm:text-sm leading-snug">
                    <span className="line-clamp-2 break-words" title={grievance.category || undefined}>
                      {grievance.category || '—'}
                    </span>
                  </td>
                  <td className="px-3.5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold leading-tight ${statusColors[grievance.status] || 'bg-gray-100 text-gray-700'}`}>
                      {grievance.status}
                    </span>
                  </td>
                  <td className="px-3.5 py-4">
                    {renderSubmittedAt(grievance.submittedAt)}
                  </td>
                  <td className="px-3.5 py-4 text-right">
                    <button
                      onClick={() => onViewGrievance(grievance)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#E6F3EA] border border-[#C9E5D2] text-green-700 hover:bg-[#C8E6C9] rounded-full text-xs font-semibold transition-colors opacity-90 group-hover:opacity-100"
                    >
                      <Eye className="h-3.5 w-3.5 shrink-0" />
                      View
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-24 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center">
                    <div className="relative mb-6 mt-4">
                      <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-75"></div>
                      <div className="relative bg-emerald-50 p-5 rounded-full flex items-center justify-center text-emerald-500">
                        <Search className="h-10 w-10 animate-pulse" />
                      </div>
                      <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-sm border border-gray-100">
                        <FileQuestion className="h-5 w-5 text-gray-400 animate-bounce" />
                      </div>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">No grievance records found</p>
                    <p className="text-sm text-gray-500 mt-2 max-w-md text-center leading-relaxed">
                      We couldn&apos;t find any grievances matching your criteria right now. Try adjusting your filters or search query.
                    </p>
                    <button
                      onClick={() => { onClearFilters(); setOpenFilter(null); }}
                      className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all hover:shadow-sm"
                    >
                      <X className="h-4 w-4" />
                      Clear filters
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalItems > 0 && (
        <div className="flex flex-col md:flex-row justify-between items-center p-4 border-t border-gray-200 gap-4 bg-gray-50/30">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-medium">Rows per page:</span>
              <div className="relative group">
                <select
                  className="appearance-none bg-white border border-gray-300 rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1E8E3E]/20 focus:border-[#1E8E3E] hover:border-[#1E8E3E] transition-all duration-300 cursor-pointer shadow-sm group-hover:shadow text-gray-700 font-medium"
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-[#1E8E3E] transition-colors duration-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
            <span>
              Showing <span className="font-semibold text-gray-900">{rangeStart}-{rangeEnd}</span> of <span className="font-semibold text-gray-900">{totalItems}</span> results
            </span>
          </div>

          <div className="flex items-center gap-1">
            <PaginationButton
              icon={<ChevronsLeft className="h-4 w-4" />}
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
            />
            <PaginationButton
              icon={<ChevronLeft className="h-4 w-4" />}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            />

            <div className="flex items-center gap-1 px-3">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = currentPage - 2 + i;
                if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;

                if (pageNum > 0 && pageNum <= totalPages) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-all duration-200
                        ${currentPage === pageNum
                          ? 'bg-[#1E8E3E] text-white shadow-md hover:bg-green-700 hover:shadow-lg hover:-translate-y-0.5'
                          : 'text-gray-600 hover:bg-white hover:text-[#1E8E3E] hover:shadow-md hover:-translate-y-0.5 border border-transparent hover:border-gray-200'}`}
                    >
                      {pageNum}
                    </button>
                  );
                }
                return null;
              })}
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <>
                  <span className="text-gray-400 px-1">...</span>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold text-gray-600 hover:bg-white hover:text-[#1E8E3E] hover:shadow-md hover:-translate-y-0.5 border border-transparent hover:border-gray-200 transition-all duration-200"
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>

            <PaginationButton
              icon={<ChevronRight className="h-4 w-4" />}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
            />
            <PaginationButton
              icon={<ChevronsRight className="h-4 w-4" />}
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages || totalPages === 0}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PaginationButton({ icon, onClick, disabled }: { icon: React.ReactNode; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 rounded-lg flex items-center justify-center transition-all duration-200
        ${disabled
          ? 'text-gray-300 cursor-not-allowed bg-transparent'
          : 'text-gray-500 hover:bg-white hover:text-[#1E8E3E] hover:shadow-md hover:-translate-y-0.5 border border-transparent hover:border-gray-200'}`}
    >
      {icon}
    </button>
  );
}

function AnimatedCheckbox({ checked, onChange, label }: { checked: boolean, onChange: (checked: boolean) => void, label: string }) {
  return (
    <label className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50 cursor-pointer transition-colors">
      <div className="relative flex items-center justify-center">
        <input
          type="checkbox"
          className="peer appearance-none w-[18px] h-[18px] border border-gray-300 rounded-[3px] bg-white checked:bg-[#1E8E3E] checked:border-[#1E8E3E] transition-all duration-200 cursor-pointer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <svg
          className={`absolute w-3 h-3 text-white pointer-events-none transition-transform duration-300 ${checked ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <span className="text-[14px] text-gray-700 font-medium whitespace-nowrap">{label}</span>
    </label>
  );
}

function FilterPopup({
  options,
  selected,
  onChange,
  isOpen,
  onClose,
}: {
  options: FilterOption[],
  selected: string[],
  onChange: (selected: string[]) => void,
  isOpen: boolean,
  onClose: () => void,
}) {
  const popupRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filtering is server-side: an empty selection means "no constraint", i.e. All.
  const isAllSelected = selected.length === 0;

  const handleToggleSingle = (value: string, checked: boolean) => {
    if (checked) {
      onChange([...selected, value]);
    } else {
      onChange(selected.filter(v => v !== value));
    }
  };

  return (
    <div
      ref={popupRef}
      onClick={(e) => e.stopPropagation()}
      className="absolute z-30 mt-2 w-max pr-0 min-w-[160px] bg-white border border-gray-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] rounded-lg flex flex-col font-normal top-full left-0 overflow-hidden"
    >
      <div className="flex flex-col divide-y divide-gray-100">
        {options.length === 0 ? (
          <div className="px-4 py-4 text-sm text-gray-400 whitespace-nowrap">No options available</div>
        ) : (
          <>
            <AnimatedCheckbox
              label="All"
              checked={isAllSelected}
              onChange={() => onChange([])}
            />
            {options.map(option => (
              <AnimatedCheckbox
                key={option.value}
                label={option.label}
                checked={selected.includes(option.value)}
                onChange={(checked) => handleToggleSingle(option.value, checked)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
