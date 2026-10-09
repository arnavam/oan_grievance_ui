"use client";

import { Search, Menu } from "lucide-react";
import { useSidebar } from "@/contexts/SidebarContext";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { selectUser } from "@/features/auth/store/authSlice";
import { canViewAllGrievances } from "@/features/auth/rbac";
import { useAppSelector } from "@/store/hooks";
import { UserProfile } from "./UserProfile";
import { NotificationBell } from "./NotificationBell";
import { LanguageSelector } from "@/components/ui/LanguageSelector";

export function Header() {
  const { toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const user = useAppSelector(selectUser);
  // Only "No Access" is translated so far — the rest of these titles predate
  // this PR's i18n setup and still need their own translation pass (see
  // messages/README.md).
  const tNoAccess = useTranslations("noAccess");

  const getPageTitle = (path: string) => {
    if (path === "/") return "Dashboard";
    if (path.startsWith("/administration")) return "Administration";
    if (path.startsWith("/all-grievances") || path.startsWith("/grievances")) {
      const seesAll = canViewAllGrievances(user?.roles ?? []);
      return seesAll ? "All Grievances" : "My Grievances";
    }
    if (path.startsWith("/submit-grievance")) return "Submit Grievance";
    if (path.startsWith("/analytics-reporting")) return "Analytics & Reporting";
    if (path.startsWith("/user-management")) return "User Management";
    if (path.startsWith("/settings")) return "Settings";
    if (path.startsWith("/no-access")) return tNoAccess("pageTitle");
    return "Dashboard";
  };

  const title = getPageTitle(pathname);

  return (
    <header className="h-16 bg-white shadow-md flex items-center justify-between px-6 sticky top-0 z-30 w-full">

      {/* Left Section: Menu + Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="text-slate-800 hover:text-white hover:bg-[#0b5c36] focus:outline-none transition-all duration-300 p-1.5 -ml-1.5 rounded-lg"
        >
          <Menu className="w-6 h-6 stroke-[2.5]" />
        </button>
        <h2 className="text-[22px] font-bold text-[#1e293b] tracking-tight">{title}</h2>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-5">

        {/* Search Bar */}
        <div className="relative hidden md:block w-80 lg:w-[400px]">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400 stroke-[2.5]" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-4 py-2.5 bg-[#f1f5f9] border border-transparent rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-[#0b5c36]/20 focus:border-[#0b5c36] placeholder-slate-500 text-slate-700 transition-all outline-none"
            placeholder="Search grievances..."
          />
        </div>

        {/* Notifications */}
        <NotificationBell />

        {/* Vertical Divider */}
        <div className="h-7 w-[1px] bg-gray-200 mx-1"></div>

        {/* Language Selector */}
        <LanguageSelector />

        {/* User Profile */}
        <UserProfile />

      </div>
    </header>
  );
}
