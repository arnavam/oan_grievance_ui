import { SlidersHorizontal, X } from 'lucide-react';
import { useModalA11y } from '@/components/ui/useModalA11y';
import { AnimatedSelect, type SelectOption } from './AnimatedSelect';
import type { OfficerStatus } from '../data/officers';

const STATUS_OPTIONS: OfficerStatus[] = ['Active', 'On Leave', 'Inactive'];

interface OfficerFiltersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  availableCategories: string[];
  regionFilter: string;
  onRegionFilterChange: (value: string) => void;
  /**
   * `{ value, label }` for the real (API) tabs — region is the one filter where the
   * backend's stored value (an area id) and its display label genuinely differ, unlike
   * category/status where they're the same string. A plain string shorthand still works
   * for the dummy Admin/Reviewer tabs, which have no id concept for region at all.
   */
  availableRegions: Array<string | SelectOption>;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  onReset: () => void;
  activeFilterCount: number;
}

export function OfficerFiltersDrawer({
  isOpen,
  onClose,
  categoryFilter,
  onCategoryFilterChange,
  availableCategories,
  regionFilter,
  onRegionFilterChange,
  availableRegions,
  statusFilter,
  onStatusFilterChange,
  onReset,
  activeFilterCount,
}: OfficerFiltersDrawerProps) {
  const dialogRef = useModalA11y<HTMLDivElement>(isOpen, onClose);

  return (
    <>
      <div
        className={`fixed inset-0 bg-gray-900/20 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="officer-filters-title"
        inert={!isOpen}
        className={`fixed inset-y-0 right-0 w-95 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 text-gray-800">
            <div className="p-1.5 bg-[#16A34A]/10 text-[#16A34A] rounded-md">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <h3 id="officer-filters-title" className="font-bold text-base">Advanced Filters</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors" aria-label="Close filters">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">Category</label>
            <AnimatedSelect
              options={availableCategories}
              value={categoryFilter}
              onChange={onCategoryFilterChange}
              placeholder="Select Category"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">Regions</label>
            <AnimatedSelect
              options={availableRegions}
              value={regionFilter}
              onChange={onRegionFilterChange}
              placeholder="Select Regions"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">Status</label>
            <AnimatedSelect
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={onStatusFilterChange}
              placeholder="Select Status"
            />
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onReset}
            className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
          >
            Reset Filters
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-[#16A34A] text-white rounded-lg text-sm font-bold hover:bg-[#15803d] transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            Apply Filters
            {activeFilterCount > 0 && (
              <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">{activeFilterCount}</span>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
