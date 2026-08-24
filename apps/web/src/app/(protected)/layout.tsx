import { auth } from "@atlas/auth";
import { Separator } from "@atlas/ui/components/separator";
import { SidebarInset, SidebarProvider } from "@atlas/ui/components/sidebar";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AgentButton } from "@/components/agent-button";
import { AgentLayout } from "@/components/agent-layout";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardContent } from "@/components/dashboard-content";
import { HeaderTitle } from "@/components/header-title";
import { ModeToggle } from "@/components/mode-toggle";
import { AgentPanelProvider } from "@/hooks/use-agent-panel";
import { EveChatProvider } from "@/hooks/use-eve-chat";

export const instant = false;

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/auth");
  }

  return (
    <SidebarProvider className="h-svh overflow-hidden" defaultOpen={false}>
      <AgentPanelProvider>
        <EveChatProvider>
          <AppSidebar variant="inset" />
          <AgentLayout>
            <DashboardContent>
              <SidebarInset className="m-2 ml-2 min-h-0 rounded-xl shadow-sm md:ml-0 md:group-has-data-[state=collapsed]/sidebar-wrapper:ml-2 lg:rounded-r-none">
                <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                  <div className="flex items-center gap-2 px-4">
                    <HeaderTitle />
                  </div>
                  <div className="flex items-center gap-2 px-4">
                    <ModeToggle />
                    <AgentButton />
                  </div>
                </header>
                <Separator />
                <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0">
                  {children}
                </div>
              </SidebarInset>
            </DashboardContent>
          </AgentLayout>
        </EveChatProvider>
      </AgentPanelProvider>
    </SidebarProvider>
  );
}
