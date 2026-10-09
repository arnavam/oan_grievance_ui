"use client";

import type { RecentGrievanceSummary } from "../data";

export function RecentGrievances({ data }: { data: RecentGrievanceSummary[] }) {
  return (
    <div className="bg-white rounded-2xl flex flex-col border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 rounded-xl">
      <div className="px-6 py-5 border-b border-gray-200">
        <h3 className="text-[16px] font-semibold text-[#111827] tracking-tight">Recent Grievances</h3>
      </div>

      {/* Scrollable container for data items */}
      <div className="flex-1 overflow-y-auto max-h-[380px] px-6 py-4 [scrollbar-color:#16A34A_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#16A34A]:rounded-full">
        <div className="space-y-4 pr-2">
          {data.map((g, i) => (
            <div key={i} className={`pb-4 ${i !== data.length - 1 ? 'border-b border-gray-100' : ''}`}>
              <div className="flex justify-between items-start mb-1.5">
                <span className="text-[12px] font-mono text-gray-500">{g.id}</span>
                <div className="flex gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[12px] font-semibold tracking-wide ${g.statusBg}`}>
                    {g.status}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[12px] font-semibold tracking-wide ${g.priorityBg}`}>
                    {g.priority}
                  </span>
                </div>
              </div>
              <h4 className="text-[13.5px] font-bold text-[#111827] mb-1">{g.title}</h4>
              <p className="text-[12px] text-gray-400">{g.location}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
