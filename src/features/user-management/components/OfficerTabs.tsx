import { Eye, Shield, ShieldCheck, User } from 'lucide-react';
import type { OfficerTabConfig, OfficerTabIcon, OfficerTabId } from '../data/officers';
import { useOfficerCount } from '../hooks/useOfficerCount';

const TAB_ICONS: Record<OfficerTabIcon, typeof ShieldCheck> = {
  first: User,
  middle: Shield,
  top: ShieldCheck,
  reviewer: Eye,
};

interface OfficerTabsProps {
  tabs: OfficerTabConfig[];
  activeTab: OfficerTabId;
  onChange: (tab: OfficerTabId) => void;
  /** The active tab's total from its own list, once loaded: fresher than its badge request. `null` until then. */
  activeTotal: number | null;
}

function TabCount({ tab, isActive, activeTotal }: { tab: OfficerTabConfig; isActive: boolean; activeTotal: number | null }) {
  // Each tab asks for its own total, so a tab never clicked into still shows its real number.
  const total = useOfficerCount(tab.role, tab.level);
  const count = isActive && activeTotal !== null ? activeTotal : total;
  return <span className={`text-xs font-bold ${isActive ? 'text-[#16A34A]' : 'text-gray-400'}`}>({count ?? '…'})</span>;
}

export function OfficerTabs({ tabs, activeTab, onChange, activeTotal }: OfficerTabsProps) {
  return (
    <div role="tablist" className="flex items-center gap-2 overflow-x-auto bg-gray-50 border border-gray-100 rounded-xl p-1.5">
      {tabs.map((tab) => {
        const Icon = TAB_ICONS[tab.icon];
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 whitespace-nowrap px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${isActive ? 'bg-white text-[#16A34A] shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <Icon size={16} />
            <span className={isActive ? 'border-b-2 border-[#16A34A] pb-0.5' : ''}>{tab.label}</span>
            <TabCount tab={tab} isActive={isActive} activeTotal={activeTotal} />
          </button>
        );
      })}
    </div>
  );
}
