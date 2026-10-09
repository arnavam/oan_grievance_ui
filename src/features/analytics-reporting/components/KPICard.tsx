import React from "react";

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle: string;
  subtitleColor: string;
  iconBgColor: string;
  Icon: React.ElementType;
  iconColor: string;
}

export function KPICard({
  title,
  value,
  unit,
  subtitle,
  subtitleColor,
  iconBgColor,
  Icon,
  iconColor,
}: KPICardProps) {
  return (
    <div className="bg-white rounded-[20px] px-6 py-5 border border-[#F1F3F4] flex justify-between items-center transition-all duration-300 hover:-translate-y-2 hover:shadow-[0px_12px_28px_-6px_rgba(0,0,0,0.12)] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] group cursor-pointer">
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] font-semibold tracking-wide transition-colors" style={{ color: subtitleColor }}>
          {subtitle}
        </span>
        <div className="flex items-baseline mt-1.5">
          <span className="text-[38px] font-extrabold text-[#1a2e21] tracking-tight leading-none">{value}</span>
          {unit && <span className="text-[15px] font-semibold text-[#6B7280] ml-1.5">{unit}</span>}
        </div>
        <p className="text-[15px] font-medium text-[#6B7280] mt-1.5">{title}</p>
      </div>
      <div className="w-[80px] h-[80px] rounded-[18px] flex items-center justify-center shrink-0 transition-transform duration-300 ease-out group-hover:scale-110" style={{ backgroundColor: iconBgColor }}>
        <Icon className="w-12 h-12 transition-all duration-500 ease-out group-hover:scale-125 group-hover:rotate-12" color={iconColor} />
      </div>
    </div>
  );
}
