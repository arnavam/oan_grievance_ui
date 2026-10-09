"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRealtimeEvent } from "@/lib/realtime";

/**
 * Header bell. Counts the realtime `notification` signals received since the
 * user last opened it. The event carries no payload, and the grievance
 * service exposes no inbox endpoint yet, so this is an unread indicator only;
 * the open grievance's own view refetches on the same signal.
 */
export function NotificationBell() {
  const t = useTranslations("notifications");
  const [unread, setUnread] = useState(0);

  useRealtimeEvent("notification", () => setUnread((count) => count + 1));

  return (
    <button
      type="button"
      onClick={() => setUnread(0)}
      aria-label={unread > 0 ? t("unreadLabel", { count: unread }) : t("label")}
      className="relative text-slate-500 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800/40 rounded ml-2 transition-colors"
    >
      <Bell className="w-[22px] h-[22px] fill-slate-500" />
      {unread > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 border-2 border-white text-[10px] font-bold leading-[14px] text-white text-center">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}
