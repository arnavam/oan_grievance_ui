import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TooltipContentProps } from "recharts";

const pieData = [
  { name: "Critical", value: 15, color: "#ef4444" },
  { name: "High", value: 30, color: "#f97316" },
  { name: "Medium", value: 40, color: "#eab308" },
  { name: "Low", value: 15, color: "#6b7280" },
];

type PieDatum = (typeof pieData)[number];

const CustomTooltip = ({ active, payload }: TooltipContentProps) => {
  if (active && payload && payload.length) {
    const data = payload[0]!.payload as PieDatum;
    return (
      <div className="bg-white p-3 border border-[#F1F3F4] rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-50 min-w-[120px]">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: data.color }} />
            <span className="text-gray-600 text-[13px] font-medium">{data.name}</span>
          </div>
          <span className="text-gray-900 font-bold text-[13px]">{data.value}%</span>
        </div>
      </div>
    );
  }
  return null;
};

export function PriorityBreakdownChart() {
  return (
    <div className="bg-white rounded-xl shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] border border-[#F1F3F4] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between h-full">
      <div className="px-6 py-5 border-b border-[#E5E7EB]">
        <h3 className="text-[16px] font-bold text-gray-900 tracking-tight">Priority Breakdown</h3>
      </div>
      <div className="p-6 pt-5 flex-1 w-full relative flex flex-col justify-center min-h-[380px]">
        <div className="flex-1 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={0}
                outerRadius={110}
                paddingAngle={0}
                dataKey="value"
                stroke="#ffffff"
                strokeWidth={3}
                isAnimationActive={true}
                animationDuration={1200}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} className="transition-all duration-150 hover:opacity-85 active:opacity-60 cursor-pointer outline-none" />
                ))}
              </Pie>
              <Tooltip content={CustomTooltip} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Custom Legend */}
        <div className="mt-6 flex justify-center gap-6">
          {pieData.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></div>
              <span className="text-[13px] text-gray-600 font-semibold">{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
