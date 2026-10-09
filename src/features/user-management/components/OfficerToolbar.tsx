import { Plus, Search, SlidersHorizontal } from 'lucide-react';

interface OfficerToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  addButtonLabel: string;
  onAddClick: () => void;
  onOpenFilters: () => void;
  activeFilterCount: number;
  /** False hides the Add button entirely — for a read-only role (Review Officer) the backend refuses anyway. */
  canManage?: boolean;
}

export function OfficerToolbar({
  searchQuery,
  onSearchChange,
  addButtonLabel,
  onAddClick,
  onOpenFilters,
  activeFilterCount,
  canManage = true,
}: OfficerToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      <div className="relative flex-1">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search officers..."
          aria-label="Search officers"
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] text-gray-700 placeholder:text-gray-400 transition-colors"
        />
      </div>

      <button
        type="button"
        onClick={onOpenFilters}
        className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors ${activeFilterCount > 0
          ? 'border-[#16A34A] text-[#16A34A] bg-[#16A34A]/5'
          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
      >
        <SlidersHorizontal size={16} />
        Advanced Filters
        {activeFilterCount > 0 && (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#16A34A] text-white text-[10px] font-bold">
            {activeFilterCount}
          </span>
        )}
      </button>

      {canManage && (
        <button
          type="button"
          onClick={onAddClick}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#16A34A] hover:bg-[#15803d] text-white rounded-lg text-sm font-bold transition-colors"
        >
          <Plus size={18} />
          {addButtonLabel}
        </button>
      )}
    </div>
  );
}
