import { Eye, Shield, ShieldCheck, User } from 'lucide-react';
import type { OfficerTabConfig, OfficerTabId } from '../data/officers';

const TAB_ICONS: Record<OfficerTabId, typeof ShieldCheck> = {
  admin: ShieldCheck,
  'nodal-l1': User,
  'nodal-l2': Shield,
  reviewer: Eye,
};

interface OfficerTabsProps {
  tabs: OfficerTabConfig[];
  activeTab: OfficerTabId;
  onChange: (tab: OfficerTabId) => void;
  /** `null` while a tab's real count hasn't loaded yet — rendered as `…` rather than a stale guess. */
  counts: Record<OfficerTabId, number | null>;
}

export function OfficerTabs({ tabs, activeTab, onChange, counts }: OfficerTabsProps) {
  return (
    <div role="tablist" className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl p-1.5">
      {tabs.map((tab) => {
        const Icon = TAB_ICONS[tab.id];
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${isActive ? 'bg-white text-[#16A34A] shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <Icon size={16} />
            <span className={isActive ? 'border-b-2 border-[#16A34A] pb-0.5' : ''}>{tab.label}</span>
            <span className={`text-xs font-bold ${isActive ? 'text-[#16A34A]' : 'text-gray-400'}`}>
              ({counts[tab.id] ?? '…'})
            </span>
          </button>
        );
      })}
    </div>
  );
}
