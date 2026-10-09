import { Mail, Phone, Globe, Pencil } from 'lucide-react';

export interface Officer {
  id: string;
  initials: string;
  initialsBg: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  region: string;
  tags: string[];
  assigned: number;
  resolved: number;
  avgTime: string;
  resolutionRate: number;
  status: 'Active' | 'On Leave' | 'Inactive';
}

export function OfficerCard({ officer, onEdit }: { officer: Officer, onEdit?: (officer: Officer) => void }) {
  return (
    <div className="bg-white rounded-xl p-6 flex flex-col h-full font-sans border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 rounded-xl">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-3">
          <div className={`w-12 h-12 rounded-[16px] bg-[#078930] flex items-center justify-center font-bold text-white ${officer.initialsBg}`}>
            {officer.initials}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-bold text-gray-900 text-[18px]">{officer.name}</h3>
              {officer.status === 'Active' && (
                <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded-full border border-[#B9F8CF]">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Active
                </span>
              )}
              {officer.status === 'On Leave' && (
                <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-yellow-700 bg-[#FEF3C6] text-[#BB4D00] px-2 py-0.5 rounded-full border border-[#FEE685]">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  On Leave
                </span>
              )}
              {officer.status === 'Inactive' && (
                <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                  Inactive
                </span>
              )}
            </div>
            <p className="text-[14px] text-gray-500 font-medium leading-tight">{officer.role}</p>
            <p className="text-[14px] text-gray-500 leading-tight">{officer.department}</p>
          </div>
        </div>
        <button 
          onClick={() => onEdit?.(officer)}
          className="text-gray-400 hover:text-gray-600 bg-[#F4F4F4] hover:bg-[#F4F4F4] p-2 rounded-lg transition-colors"
        >
          <Pencil size={16} className="text-gray-900" />
        </button>
      </div>

      {/* Contact Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-[14px] text-gray-500">
          <Mail size={16} className="text-gray-400" />
          {officer.email}
        </div>
        <div className="flex items-center gap-2 text-[14px] text-gray-500">
          <Phone size={16} className="text-gray-400" />
          {officer.phone}
        </div>
        <div className="flex items-center gap-2 text-[14px] text-gray-500">
          <Globe size={16} className="text-gray-400" />
          Region: <span className="font-semibold text-gray-600">{officer.region}</span>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-5 mt-auto">
        {officer.tags.map((tag, idx) => (
          <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-semibold text-[#16A34A] border border-[#BCF5CF] bg-[#F0FDF4]">
            {tag}
          </span>
        ))}
      </div>

      <div className="w-full h-[1px] bg-gray-200 mb-4"></div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 text-center mb-4">
        <div>
          <div className="text-[16px] font-bold text-gray-900">{officer.assigned}</div>
          <div className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">Assigned</div>
        </div>
        <div>
          <div className="text-[16px] font-bold text-gray-900">{officer.resolved}</div>
          <div className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">Resolved</div>
        </div>
        <div>
          <div className="text-[16px] font-bold text-gray-900">{officer.avgTime}</div>
          <div className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">Avg Time</div>
        </div>
      </div>

      {/* Resolution Rate */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[14px] font-semibold text-gray-500">Resolution Rate</span>
          <span className="text-[14px] font-bold text-gray-900">{officer.resolutionRate}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full ${officer.resolutionRate >= 80 ? 'bg-[#16A34A]' : 'bg-orange-400'}`}
            style={{ width: `${officer.resolutionRate}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
