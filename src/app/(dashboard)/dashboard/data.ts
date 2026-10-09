export const dashboardData = {
  kpis: [
    { title: "Total Grievances", value: 128, trend: 12, type: "percentage" },
    { title: "Awaiting Action", value: 40, trend: 5, type: "number" },
    { title: "Resolved", value: 48, trend: 8, type: "number" },
    { title: "Escalated", value: 1, trend: null, type: "alert" },
  ],
  monthlyTrend: [
    { month: "Nov 2025", submitted: 55, resolved: 35 },
    { month: "Dec 2025", submitted: 62, resolved: 42 },
    { month: "Jan 2026", submitted: 48, resolved: 30 },
    { month: "Feb 2026", submitted: 70, resolved: 55 },
    { month: "Mar 2026", submitted: 85, resolved: 70 },
    { month: "Apr 2026", submitted: 130, resolved: 115 },
  ],
  statusDistribution: [
    { name: "Submitted", value: 64, color: "#4f46e5" },
    { name: "Assigned", value: 21, color: "#3b82f6" },
    { name: "In Progress", value: 14, color: "#6366f1" },
    { name: "More Info Needed", value: 7, color: "#f97316" },
    { name: "Pending Submitter", value: 7, color: "#eab308" },
    { name: "Resolved", value: 21, color: "#10b981" },
    { name: "Closed", value: 8, color: "#374151" },
  ],
  serviceCategories: [
    { name: "Inputs", value: 34, max: 40, color: "bg-[#2563eb]" },
    { name: "Schemes", value: 28, max: 40, color: "bg-[#6366f1]" },
    { name: "Payments", value: 31, max: 40, color: "bg-[#a855f7]" },
    { name: "Credit", value: 19, max: 40, color: "bg-[#c084fc]" },
    { name: "Markets", value: 16, max: 40, color: "bg-[#d8b4fe]" },
  ],
  recentGrievances: [
    {
      id: "OROM-BISH-INP-12345",
      title: "Certified maize seed supplied with poor germination rate",
      location: "Addis Abeba - Oromia",
      status: "In Progress",
      statusBg: "bg-[#fef3c7] text-[#b45309]",
      priority: "High",
      priorityBg: "bg-[#fee2e2] text-[#b91c1c]",
    },
    {
      id: "AMHA-BAHE-PAY-08621",
      title: "Teff produce payment overdue by 45 days",
      location: "Debrezeint Farmers Cooperative - Amhara",
      status: "Pending Submission",
      statusBg: "bg-[#dbeafe] text-[#1d4ed8]",
      priority: "Critical",
      priorityBg: "bg-[#fee2e2] text-[#991b1b]",
    },
    {
      id: "OROM-SEBA-SCH-03523",
      title: "PSNP safety net scheme payment not disbursed for Q1 2026",
      location: "Almaz Worku - Oromia",
      status: "Submitted",
      statusBg: "bg-[#e0e7ff] text-[#4338ca]",
      priority: "High",
      priorityBg: "bg-[#fee2e2] text-[#b91c1c]",
    },
    {
      id: "SNPP-HAWA-CRO-03510",
      title: "Agricultural loan application rejected without justification",
      location: "Habitamu Desta - Sidama",
      status: "Resolved",
      statusBg: "bg-[#d1fae5] text-[#047857]",
      priority: "Medium",
      priorityBg: "bg-[#fef3c7] text-[#b45309]",
    },
    {
      id: "TIGR-MEKE-INP-09822",
      title: "Delay in fertilizer distribution for current sowing season",
      location: "Mekelle Farmers Union - Tigray",
      status: "In Progress",
      statusBg: "bg-[#fef3c7] text-[#b45309]",
      priority: "High",
      priorityBg: "bg-[#fee2e2] text-[#b91c1c]",
    },
    {
      id: "AFAR-SEME-WAT-04192",
      title: "Irrigation water quota unfairly reduced by local administration",
      location: "Semera - Afar",
      status: "Submitted",
      statusBg: "bg-[#e0e7ff] text-[#4338ca]",
      priority: "Medium",
      priorityBg: "bg-[#fef3c7] text-[#b45309]",
    },
    {
      id: "DIRE-DAWA-MKT-07731",
      title: "Market access denied for certified organic produce",
      location: "Dire Dawa",
      status: "Pending Submission",
      statusBg: "bg-[#dbeafe] text-[#1d4ed8]",
      priority: "Low",
      priorityBg: "bg-[#f3f4f6] text-[#4b5563]",
    },
    {
      id: "SOMA-JIGI-VET-02184",
      title: "Shortage of veterinary vaccines for livestock disease outbreak",
      location: "Jigjiga - Somali",
      status: "In Progress",
      statusBg: "bg-[#fef3c7] text-[#b45309]",
      priority: "Critical",
      priorityBg: "bg-[#fee2e2] text-[#991b1b]",
    },
    {
      id: "GAMB-NUE-LND-05521",
      title: "Dispute over agricultural land boundary with neighboring cooperative",
      location: "Nuer Zone - Gambella",
      status: "Resolved",
      statusBg: "bg-[#d1fae5] text-[#047857]",
      priority: "High",
      priorityBg: "bg-[#fee2e2] text-[#b91c1c]",
    },
    {
      id: "BNSH-ASOS-EQU-03411",
      title: "Defective farming equipment received through government subsidy",
      location: "Asosa - Benishangul-Gumuz",
      status: "Submitted",
      statusBg: "bg-[#e0e7ff] text-[#4338ca]",
      priority: "Medium",
      priorityBg: "bg-[#fef3c7] text-[#b45309]",
    },
    {
      id: "HAR-HAR-TRN-09211",
      title: "Lack of transportation support for harvested crops to central market",
      location: "Harar",
      status: "Pending Submission",
      statusBg: "bg-[#dbeafe] text-[#1d4ed8]",
      priority: "High",
      priorityBg: "bg-[#fee2e2] text-[#b91c1c]",
    }
  ],
};

// Derived from the mock data itself rather than redeclared per-component —
// once this is fetched from a real backend, these move to wherever that
// response type lives, but every chart/card component below can keep
// importing from here.
export type KpiCard = (typeof dashboardData)['kpis'][number];
export type MonthlyTrendPoint = (typeof dashboardData)['monthlyTrend'][number];
export type StatusDistributionSlice = (typeof dashboardData)['statusDistribution'][number];
export type ServiceCategoryStat = (typeof dashboardData)['serviceCategories'][number];
export type RecentGrievanceSummary = (typeof dashboardData)['recentGrievances'][number];
