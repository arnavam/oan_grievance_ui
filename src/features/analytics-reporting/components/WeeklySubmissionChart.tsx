import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { TooltipContentProps } from "recharts";

const lineChartData = [
  { name: "W1\nMar 26", received: 18, resolved: 14 },
  { name: "W2\nMar 26", received: 22, resolved: 19 },
  { name: "W3\nMar 26", received: 26, resolved: 22 },
  { name: "W4\nMar 26", received: 19, resolved: 17 },
  { name: "W1\nApr 26", received: 28, resolved: 25 },
  { name: "W2\nApr 26", received: 24, resolved: 21 },
  { name: "W3\nApr 26", received: 30, resolved: 27 },
];

const CustomTooltip = ({ active, payload, label }: TooltipContentProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-[#F1F3F4] rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-200 min-w-[140px]">
        <p className="text-gray-900 font-semibold text-[13px] mb-2 pb-2 border-b border-[#F1F3F4]">{label}</p>
        <div className="flex flex-col gap-2">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
                <span className="text-gray-600 text-[13px] font-medium">{entry.name}</span>
              </div>
              <span className="text-gray-900 font-bold text-[13px]">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export function WeeklySubmissionChart() {
  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md flex flex-col border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 h-full">
      <div className="px-6 py-5 border-b border-[#E5E7EB]">
        <h3 className="text-[16px] font-bold text-gray-900 tracking-tight">Weekly Submission vs Resolution</h3>
      </div>
      <div className="p-6 pt-5 flex-1 w-full min-h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={lineChartData} margin={{ top: 5, right: 40, left: -20, bottom: 20 }}>
            <CartesianGrid vertical={true} horizontal={true} stroke="#F1F3F4" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
              dy={15}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
              domain={[0, 30]}
              ticks={[0, 10, 20, 30]}
              dx={-10}
            />
            <Tooltip content={CustomTooltip} cursor={{ stroke: '#e2e8f0', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Legend
              iconType="circle"
              wrapperStyle={{ bottom: '-10px', fontSize: '13px', fontWeight: 500, color: '#475569' }}
            />
            <Area
              type="monotone"
              dataKey="received"
              name="Received"
              stroke="#3b82f6"
              strokeWidth={3}
              fill="#eef6fd"
              fillOpacity={1}
              dot={{ r: 4, fill: "#3b82f6", strokeWidth: 0 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              isAnimationActive={true}
              animationDuration={1500}
              animationEasing="ease-out"
            />
            <Area
              type="monotone"
              dataKey="resolved"
              name="Resolved"
              stroke="#10B981"
              strokeWidth={3}
              fill="none"
              dot={{ r: 4, fill: "#10B981", strokeWidth: 0 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              isAnimationActive={true}
              animationDuration={1500}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
