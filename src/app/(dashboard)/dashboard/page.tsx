import { TopHeader } from "./components/TopHeader";
import { KpiCards } from "./components/KpiCards";
import { MonthlyTrendChart } from "./components/MonthlyTrendChart";
import { StatusDistributionChart } from "./components/StatusDistributionChart";
import { ServiceCategoryChart } from "./components/ServiceCategoryChart";
import { RecentGrievances } from "./components/RecentGrievances";

import { dashboardData } from "./data";

async function getDashboardData() {
  // Simulating an async fetch call but returning local mock data
  return dashboardData;
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6 w-full">
      <TopHeader />
      <KpiCards data={data.kpis} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <MonthlyTrendChart data={data.monthlyTrend} />
        <StatusDistributionChart data={data.statusDistribution} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ServiceCategoryChart data={data.serviceCategories} />
        <RecentGrievances data={data.recentGrievances} />
      </div>
    </div>
  );
}
