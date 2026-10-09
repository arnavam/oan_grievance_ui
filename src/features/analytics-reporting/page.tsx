"use client";

import { TimerIcon, CheckCircleIcon, TrendDotsIcon, StarIcon } from "./components/KPIIcons";
import { KPICard } from "./components/KPICard";
import { TopHeader } from "./components/TopHeader";
import { WeeklySubmissionChart } from "./components/WeeklySubmissionChart";
import { ResolutionRegionChart } from "./components/ResolutionRegionChart";
import { VolumeServiceChart } from "./components/VolumeServiceChart";
import { PriorityBreakdownChart } from "./components/PriorityBreakdownChart";

export function AnalyticsReportingPage() {
    return (
        <div className="flex flex-col gap-6 font-sans pb-2">

            <TopHeader />

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Avg Resolution Time"
                    value="12.4"
                    unit="days"
                    subtitle="- 2.1 days last month"
                    subtitleColor="#ef4444"
                    iconBgColor="#eff6ff"
                    Icon={TimerIcon}
                    iconColor="#3b82f6"
                />
                <KPICard
                    title="Resolution Rate"
                    value="65.6%"
                    subtitle="+4.2% vs last month"
                    subtitleColor="#16a34a"
                    iconBgColor="#f0fdf4"
                    Icon={CheckCircleIcon}
                    iconColor="#16a34a"
                />
                <KPICard
                    title="Escalation Rate"
                    value="9.4%"
                    subtitle="+1.1% vs last month"
                    subtitleColor="#16a34a"
                    iconBgColor="#fff7ed"
                    Icon={TrendDotsIcon}
                    iconColor="#f97316"
                />
                <KPICard
                    title="Farmer Satisfaction"
                    value="72%"
                    subtitle="Based on 84 responses"
                    subtitleColor="#16a34a"
                    iconBgColor="#fefce8"
                    Icon={StarIcon}
                    iconColor="#facc14"
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-1">
                <WeeklySubmissionChart />
                <ResolutionRegionChart />
                <VolumeServiceChart />
                <PriorityBreakdownChart />
            </div>
        </div>
    );
}
