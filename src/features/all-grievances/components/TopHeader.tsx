
export function TopHeader({
  totalCount,
  summaryLoading = false,
  summaryUnavailable = false,
  title = "All Grievances",
}: {
  totalCount: number;
  /** True while the first summary fetch is in flight, so a zero count is not a real total. */
  summaryLoading?: boolean;
  /** True when the KPI summary request failed, so a zero count is not a real total. */
  summaryUnavailable?: boolean;
  title?: string;
}) {
  return (
    <div className="bg-white rounded-xl p-6 border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 rounded-xl">
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {summaryLoading ? (
          <span
            role="status"
            className="bg-gray-100 text-gray-500 text-sm font-bold px-3 py-1 rounded-full flex items-center animate-pulse"
          >
            Loading
          </span>
        ) : summaryUnavailable ? (
          <span className="bg-red-50 text-red-700 text-sm font-bold px-3 py-1 rounded-full flex items-center">
            Total unavailable
          </span>
        ) : (
          <span className="bg-[#E6F4EA] text-[#1E8E3E] text-sm font-bold px-3 py-1 rounded-full flex items-center">
            {totalCount} Total
          </span>
        )}
      </div>
      <p className="text-gray-500 text-sm">
        Track, manage and monitor all your submitted grievances in one place.
      </p>
    </div>
  );
}
