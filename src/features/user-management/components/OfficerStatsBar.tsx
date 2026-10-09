interface OfficerStatsBarProps {
  active: number;
  onLeave: number;
  inactive: number;
}

export function OfficerStatsBar({ active, onLeave, inactive }: OfficerStatsBarProps) {
  return (
    <div className="flex items-center justify-end gap-5 text-xs font-medium text-gray-600">
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
        {active} Active
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        {onLeave} On Leave
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        {inactive} Inactive
      </span>
    </div>
  );
}
