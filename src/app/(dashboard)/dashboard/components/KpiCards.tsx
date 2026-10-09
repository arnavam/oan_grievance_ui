import { FileText, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import type { KpiCard } from "../data";

export function KpiCards({ data: kpis }: { data: KpiCard[] }) {

  const iconMap: Record<string, React.ReactNode> = {
    "Total Grievances": <FileText className="w-8 h-8 text-blue-600 stroke-[2] transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" />,
    "Awaiting Action": <Clock className="w-8 h-8 text-amber-500 stroke-[2] transition-transform duration-500 ease-in-out group-hover:rotate-[180deg]" />,
    "Resolved": <CheckCircle2 className="w-8 h-8 text-emerald-500 stroke-[2] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />,
    "Escalated": <AlertTriangle className="w-8 h-8 text-purple-600 stroke-[2] transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1" />,
  };

  const bgMap: Record<string, string> = {
    "Total Grievances": "bg-blue-50",
    "Awaiting Action": "bg-amber-50",
    "Resolved": "bg-emerald-50",
    "Escalated": "bg-purple-50",
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ">
      {kpis.map((card, index) => (
        <div key={index} className="group bg-white p-6 rounded-2xl flex flex-col justify-between h-[140px] transition-all duration-300 hover:shadow-md hover:border-slate-200 cursor-pointer border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 rounded-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[16px] font-semibold text-slate-500 mb-2">{card.title}</p>
              <h3 className="text-[32px] leading-none font-bold text-slate-800 tracking-tight">{card.value}</h3>
            </div>
            <div className={`p-5 rounded-2xl transition-colors duration-300 ${bgMap[card.title] || 'bg-slate-50'}`}>
              {iconMap[card.title]}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[14px] font-bold text-emerald-600 tracking-tight">
              {card.type === 'alert' ? '↗ SLA breach' : `↗ +${card.trend}${card.type === 'percentage' ? '%' : ''}`}
            </span>
            <span className="text-[13px] text-gray-600">
              {card.type === 'alert' ? 'triggers' : (card.type === 'percentage' ? 'from last month' : (card.title === 'Resolved' ? 'resolved this week' : 'new this week'))}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
