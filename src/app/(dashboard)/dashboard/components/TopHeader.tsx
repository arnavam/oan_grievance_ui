import { AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";

export function TopHeader() {
  return (
    <div className="space-y-4">
      {/* Title Card */}
      <div className="bg-white p-6 rounded-xl border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 rounded-xl">
        <h1 className="text-[22px] font-bold text-[#111827]">OAN Grievance Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1.5">
          Agriculture domain grievances — Ethiopia OAN Portal, Fiscal Year 2026
        </p>
      </div>

      {/* Alert Banner */}
      <div className="bg-[#fffcf0] px-5 py-3.5 rounded-xl flex items-center justify-between text-sm border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="bg-[#fef3c7] p-1.5 rounded-md">
            <AlertTriangle className="w-[18px] h-[18px] text-[#d97706] stroke-[2.5]" />
          </div>
          <span className="text-[#92400e]">
            <span className="font-semibold text-[#b45309]">1 escalated grievance</span> require immediate senior officer attention.
          </span>
        </div>
        <Link href="/all-grievances" className="flex items-center gap-1.5 font-bold text-[#d97706] hover:text-[#b45309] transition-colors">
          View all <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </Link>
      </div>
    </div>
  );
}
