"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import type { MonthlyTrendPoint } from "../data";

export function MonthlyTrendChart({ data }: { data: MonthlyTrendPoint[] }) {
  return (
    <div className="lg:col-span-2 bg-white rounded-2xl flex flex-col h-[400px] border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 rounded-xl">
      <div className="px-6 py-5 border-b border-gray-200">
        <h3 className="text-[16px] font-semibold text-[#111827] tracking-tight">Monthly Submission & Resolution Trend</h3>
      </div>

      <div className="flex-1 w-full -ml-4 p-6 pt-4 pb-2 focus:outline-none">
        <ResponsiveContainer width="100%" height="100%" className="focus:outline-none" style={{ outline: 'none' }}>
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            barGap={4}
            style={{ outline: 'none' }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 500 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 500 }}
              ticks={[0, 35, 70, 105, 140]}
              domain={[0, 140]}
            />
            <Tooltip
              cursor={{ fill: '#f3f4f6', opacity: 0.4 }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '8px 12px' }}
              itemStyle={{ fontSize: '12px', padding: '2px 0' }}
              labelStyle={{ fontSize: '13px', fontWeight: 500, color: '#6b7280', marginBottom: '2px' }}
            />
            <Bar
              dataKey="submitted"
              name="Submitted"
              fill="#2563eb"
              radius={[2, 2, 0, 0]}
              maxBarSize={30}
              isAnimationActive={true}
              animationDuration={1500}
              animationEasing="ease-out"
            />
            <Bar
              dataKey="resolved"
              name="Resolved"
              fill="#10b981"
              radius={[2, 2, 0, 0]}
              maxBarSize={30}
              isAnimationActive={true}
              animationDuration={1500}
              animationEasing="ease-out"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 text-[12px] text-gray-500 font-medium pb-6 pt-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
          Submitted
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          Resolved
        </div>
      </div>
    </div>
  );
}
