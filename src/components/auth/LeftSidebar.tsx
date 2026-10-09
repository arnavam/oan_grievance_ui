const activeOfficers = [
  { src: '/bb4a5b79fae40c0a468fa967443678ee9eb31bee.jpg', alt: 'Officer 1' },
  { src: '/c08326dd4541f98026723b0901e8ecaa33f73c17.jpg', alt: 'Officer 2' },
  { src: '/15546d74033e37b4f05979285cbde9b0d8a08256.jpg', alt: 'Officer 3' },
];

interface LeftSidebarProps {
  /** Names the portal this panel fronts. */
  badge?: string;
}

export function LeftSidebar({ badge = 'Grievance Management Portal' }: LeftSidebarProps) {
  return (
    <div className="w-full md:w-[45%] bg-[#0B6C43] p-6 sm:p-10 md:p-14 flex flex-col relative overflow-hidden">
      <div className="flex items-center space-x-3 mb-16 relative z-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="OARI Logo" width={1277} height={851} className="h-[28px] sm:h-[34px] w-auto shrink-0" />
        <div className="flex flex-col border-l-2 border-white/30 pl-3">
          <span className="text-[13px] font-bold text-white leading-tight tracking-wide">Ethiopia OpenAgriNet</span>
          <span className="text-[11px] text-white/80 font-medium leading-tight tracking-wide">Grievance Management</span>
        </div>
      </div>

      <div className="relative z-10 mb-8 md:mb-0">
        <span className="inline-block px-4 py-1.5 bg-white/10 text-white/90 text-[10px] font-bold tracking-wider rounded-full uppercase mb-8 border border-white/10">
          {badge}
        </span>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-[1.2] tracking-tight">
          Resolving<br />Grievances,<br />Building Trust
        </h1>
        <p className="text-white/80 text-sm md:text-[15px] leading-relaxed max-w-sm font-medium pr-4">
          A transparent grievance redressal system connecting farmers, field agents, and administrators across Ethiopia&apos;s agricultural credit network.
        </p>
      </div>

      <div className="mt-8 md:mt-auto relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex -space-x-3">
          {activeOfficers.map((officer, index) => (
            <div key={index} className="w-10 h-10 rounded-full border-2 border-[#0B6C43] overflow-hidden flex items-center justify-center bg-white z-[3]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={officer.src} alt={officer.alt} width={80} height={80} className="w-full h-full object-cover" />
            </div>
          ))}
          <div className="w-10 h-10 rounded-full bg-[#1F2937] border-2 border-[#0B6C43] flex items-center justify-center text-[10px] font-bold text-white z-[0]">
            +2k
          </div>
        </div>
        <span className="text-xs text-white/70 font-medium">Active officers handling cases today</span>
      </div>
    </div>
  );
}
