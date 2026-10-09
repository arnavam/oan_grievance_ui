import { ChevronLeft, ChevronRight } from 'lucide-react';

interface OfficerPaginationProps {
  page: number;
  totalPages: number;
  pageCount: number;
  totalCount: number;
  listLabel: string;
  onPageChange: (page: number) => void;
}

function getPageItems(current: number, total: number): Array<number | 'ellipsis'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const items = new Set<number>([1, 2, total - 1, total, current - 1, current, current + 1]);
  const sorted = [...items].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);

  const result: Array<number | 'ellipsis'> = [];
  let prev = 0;
  for (const n of sorted) {
    if (prev && n - prev > 1) result.push('ellipsis');
    result.push(n);
    prev = n;
  }
  return result;
}

export function OfficerPagination({ page, totalPages, pageCount, totalCount, listLabel, onPageChange }: OfficerPaginationProps) {
  if (totalCount === 0) return null;
  const pageItems = getPageItems(page, totalPages);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
      <span>
        Showing <span className="font-semibold text-gray-900">{pageCount}</span> of{' '}
        <span className="font-semibold text-gray-900">{totalCount}</span> {listLabel} lists
      </span>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronLeft size={16} />
          Previous
        </button>

        {pageItems.map((item, idx) =>
          item === 'ellipsis' ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              className={`w-8 h-8 flex items-center justify-center rounded-md font-medium transition-colors ${item === page ? 'bg-[#16A34A] text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
