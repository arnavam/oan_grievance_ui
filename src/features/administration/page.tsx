"use client";

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { TopHeader } from './components/TopHeader';
import { AdministrationTabs } from './components/AdministrationTabs';
import CategorySlaConfigurationPage from './tabs-pages/category-sla-configuration/page';
import NotificationConfigPage from './tabs-pages/notification-config/page';
import ResponseTemplatesPage from './tabs-pages/response-templates/page';

const TAB_SLUG_MAP: Record<string, string> = {
    'category-sla': 'Category & SLA Configuration',
    'notification-config': 'Notification Config',
    'response-templates': 'Response Templates',
};

const TAB_NAME_TO_SLUG: Record<string, string> = {
    'Category & SLA Configuration': 'category-sla',
    'Notification Config': 'notification-config',
    'Response Templates': 'response-templates',
};

export default function AdministrationPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const tabParam = searchParams.get('tab')?.toLowerCase();

    const activeTab = useMemo(() => {
        if (!tabParam) return 'Category & SLA Configuration';
        if (TAB_SLUG_MAP[tabParam]) return TAB_SLUG_MAP[tabParam];
        // Normalize any hyphens/underscores/spaces
        const normalized = tabParam.replace(/[_\s]+/g, '-');
        if (TAB_SLUG_MAP[normalized]) return TAB_SLUG_MAP[normalized];
        // Match case-insensitively against display names
        for (const [, name] of Object.entries(TAB_SLUG_MAP)) {
            if (name.toLowerCase() === tabParam.toLowerCase()) return name;
        }
        return 'Category & SLA Configuration';
    }, [tabParam]);

    const handleTabChange = useCallback(
        (tabName: string) => {
            const slug = TAB_NAME_TO_SLUG[tabName] || 'category-sla';
            const params = new URLSearchParams(searchParams.toString());
            params.set('tab', slug);
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        },
        [pathname, router, searchParams]
    );

    return (
        <div className="flex flex-col gap-6 font-sans pb-0">

            {/* Header */}
            <TopHeader activeTab={activeTab} />

            <AdministrationTabs activeTab={activeTab} onTabChange={handleTabChange} />

            {activeTab === 'Category & SLA Configuration' ? (
                <CategorySlaConfigurationPage />
            ) : activeTab === 'Notification Config' ? (
                <NotificationConfigPage />
            ) : activeTab === 'Response Templates' ? (
                <ResponseTemplatesPage />
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500 font-medium">
                    Content for {activeTab} is under construction.
                </div>
            )}

        </div>
    );
}
