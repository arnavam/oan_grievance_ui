import { KeyRound, Mail, Phone, MapPin, Pencil } from 'lucide-react';
import { DEFAULT_TAG_STYLE, STATUS_STYLES, TAG_STYLES, type Officer } from '../data/officers';

interface OfficerCardProps {
  officer: Officer;
  onEdit: (officer: Officer) => void;
  /** False hides the Edit button — for a read-only role (Review Officer) the backend refuses the write anyway. */
  canEdit?: boolean;
}

export function OfficerCard({ officer, onEdit, canEdit = true }: OfficerCardProps) {
  const statusStyle = STATUS_STYLES[officer.status];
  const rate = Math.min(100, Math.max(0, officer.resolutionRate));
  const barColor = rate >= 75 ? 'bg-[#16A34A]' : rate >= 50 ? 'bg-amber-500' : 'bg-red-500';
  const rateTextColor = rate >= 75 ? 'text-[#16A34A]' : rate >= 50 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="group relative bg-white rounded-xl border border-[#F1F3F4] p-5 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex flex-col gap-4">
      {canEdit && (
        <button
          type="button"
          onClick={() => onEdit(officer)}
          aria-label={`Edit ${officer.name}`}
          className="absolute top-4 right-4 text-gray-400 hover:text-[#16A34A] transition-colors p-1 rounded-md hover:bg-gray-50"
        >
          <Pencil size={16} />
        </button>
      )}

      <div className="flex items-start gap-3 pr-6">
        <div className={`w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${officer.avatarBg} ${officer.avatarColor}`}>
          {officer.avatarInitials}
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-900 truncate">{officer.name}</h3>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
              {officer.status}
            </span>
            {officer.mustChangePassword && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-amber-50 text-amber-700 border-amber-200">
                <KeyRound size={11} />
                Awaiting first sign-in
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700 font-medium truncate">{officer.roleTitle}</p>
          <p className="text-xs text-gray-500 truncate">{officer.department}</p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 text-xs text-gray-500">
        <div className="flex items-center gap-2 min-w-0">
          <Mail size={13} className="flex-shrink-0 text-gray-400" />
          <span className="truncate">{officer.email}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone size={13} className="flex-shrink-0 text-gray-400" />
          <span>{officer.phone}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={13} className="flex-shrink-0 text-gray-400" />
          <span>Region: {officer.region}</span>
        </div>
      </div>

      {officer.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {officer.tags.map((tag) => {
            const style = TAG_STYLES[tag] ?? DEFAULT_TAG_STYLE;
            return (
              <span key={tag} className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${style.bg} ${style.text} ${style.border}`}>
                {tag}
              </span>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100 pt-3">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-sm font-bold text-gray-900">{officer.assigned}</span>
          <span className="text-[11px] text-gray-500">Assigned</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-sm font-bold text-gray-900">{officer.resolved}</span>
          <span className="text-[11px] text-gray-500">Resolved</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-sm font-bold text-gray-900">{officer.avgTimeDays}d</span>
          <span className="text-[11px] text-gray-500">Avg Time</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] text-gray-500">
          <span>Resolution Rate</span>
          <span className={`font-semibold ${rateTextColor}`}>{officer.resolutionRate}%</span>
        </div>
        <div
          className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden"
          role="progressbar"
          aria-label="Resolution rate"
          aria-valuenow={rate}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${rate}%` }} />
        </div>
      </div>
    </div>
  );
}
