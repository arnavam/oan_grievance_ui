"use client";

import { useEffect, useState } from "react";
import type { ServiceCategoryStat } from "../data";

export function ServiceCategoryChart({ data }: { data: ServiceCategoryStat[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Add a small delay for a staggered/smooth entrance animation
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-white rounded-2xl flex flex-col border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 rounded-xl rounded-xl">
      <div className="px-6 py-5 border-b border-gray-200">
        <h3 className="text-[16px] font-semibold text-[#111827] tracking-tight">By Service Category</h3>
      </div>

      <div className="p-6 space-y-[18px] flex-1">
        {data.map((cat, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="flex justify-between text-[14px] font-semibold text-[#0D1117]">
              <span>{cat.name}</span>
              <span>{cat.value}</span>
            </div>
            <div className="w-full bg-[#f3f4f6] rounded-full h-[6px] overflow-hidden">
              <div
                className={`h-full rounded-full ${cat.color} transition-all duration-1000 ease-out`}
                style={{ width: mounted ? `${(cat.value / cat.max) * 100}%` : '0%' }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
