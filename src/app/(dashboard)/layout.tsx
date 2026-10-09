import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { IdleSessionGuard } from "@/features/auth/components/IdleSessionGuard";
import { RealtimeConnection } from "@/components/realtime/RealtimeConnection";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-scroll p-6 bg-[#f3f4f6]">
            {children}
          </main>
        </div>
      </div>
      <IdleSessionGuard />
      <RealtimeConnection />
    </SidebarProvider>
  );
}
