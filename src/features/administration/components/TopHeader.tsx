interface TopHeaderProps {
  activeTab: string;
}

export function TopHeader({ activeTab }: TopHeaderProps) {
  const title = activeTab;
  let description = '';

  switch (activeTab) {
    case 'Category Configuration':
      description = 'Manage grievance categories and their grievance types. Each category shows its base SLA days; set the SLA rules on the SLA Rules tab.';
      break;
    case 'SLA Rules':
      description = 'Set the SLA days of each category: its base rule, and the rules for a level, type, area or season.';
      break;
    case 'Notification Config':
      description = 'Configure notification triggers, recipients, and message templates for grievance updates.';
      break;
    case 'Response Templates':
      description = 'Manage nodal officers, category assignments, notification templates, and standard response templates.';
      break;
    default:
      description = `Manage ${activeTab.toLowerCase()} settings.`;
  }

  return (
    <div className="bg-white rounded-xl p-6 font-sans border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 rounded-xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-[15px] text-gray-500 font-medium">
        {description}
      </p>
    </div>
  );
}
