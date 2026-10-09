import { useState, useEffect } from "react";

const regionData = [
  { region: "Addis Ababa", value: 78 },
  { region: "Oromia", value: 64 },
  { region: "Amhara", value: 71 },
  { region: "SNNPR", value: 55 },
  { region: "Tigray", value: 48 },
  { region: "Somali", value: 42 },
  { region: "Sidama", value: 60 },
  { region: "Afar", value: 38 },
];

export function ResolutionRegionChart() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md flex flex-col border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
      <div className="px-6 py-5 border-b border-[#E5E7EB]">
        <h3 className="text-[16px] font-bold text-gray-900 tracking-tight">Resolution Rate by Region (%)</h3>
      </div>
      <div className="p-6 pt-5 flex-1 flex flex-col relative min-h-[380px]">
        {/* Table Grid Background */}
        <div className="absolute left-6 right-6 top-5 bottom-10 pointer-events-none">
          <div className="w-full h-full relative">
            <div className="absolute top-0 bottom-0 left-[0%] border-l border-[#F1F3F4]"></div>
            <div className="absolute top-0 bottom-0 left-[25%] border-l border-[#F1F3F4]"></div>
            <div className="absolute top-0 bottom-0 left-[50%] border-l border-[#F1F3F4]"></div>
            <div className="absolute top-0 bottom-0 left-[75%] border-l border-[#F1F3F4]"></div>
            <div className="absolute top-0 bottom-0 left-[100%] border-l border-[#F1F3F4]"></div>
          </div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col gap-3">
          {regionData.map((item) => (
            <div key={item.region} className="flex-1 flex flex-col justify-center border-b border-[#F1F3F4] group relative cursor-pointer active:scale-[0.99] active:opacity-80 transition-all duration-150">
              <div className="flex justify-between items-center mb-0.5 px-0.5">
                <span className="text-[12.5px] font-bold text-[#334155]">{item.region}</span>
                <span className="text-[12.5px] font-bold text-gray-900">{item.value}%</span>
              </div>
              <div className="w-full h-[8px] bg-[#f8fafc] rounded-full overflow-hidden relative z-10">
                <div
                  className="h-full bg-[#10b981] rounded-full transition-all duration-1000 ease-out group-hover:brightness-110"
                  style={{ width: mounted ? `${item.value}%` : '0%' }}
                ></div>
              </div>

              {/* Tooltip */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-1 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 transform group-hover:-translate-y-1">
                <div className="bg-white p-2.5 border border-[#F1F3F4] rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center gap-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shadow-sm bg-[#10b981]" />
                    <span className="text-gray-600 text-[13px] font-medium">{item.region}</span>
                  </div>
                  <span className="text-gray-900 font-bold text-[13px]">{item.value}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* X-axis labels for bar chart */}
        <div className="relative pt-3 h-[24px] z-10 w-full mt-1">
          <span className="absolute left-[0%] text-[11px] font-semibold text-[#6B7280]">0%</span>
          <span className="absolute left-[25%] -translate-x-1/2 text-[11px] font-semibold text-[#6B7280]">25%</span>
          <span className="absolute left-[50%] -translate-x-1/2 text-[11px] font-semibold text-[#6B7280]">50%</span>
          <span className="absolute left-[75%] -translate-x-1/2 text-[11px] font-semibold text-[#6B7280]">75%</span>
          <span className="absolute left-[100%] -translate-x-full text-[11px] font-semibold text-[#6B7280]">100%</span>
        </div>
      </div>
    </div>
  );
}
