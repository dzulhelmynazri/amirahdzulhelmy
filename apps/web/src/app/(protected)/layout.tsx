import { auth } from "@atlas/auth";
import { Separator } from "@atlas/ui/components/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@atlas/ui/components/sidebar";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AgentButton } from "@/components/agent-button";
import { AppSidebar } from "@/components/app-sidebar";
import { AtlasAgent } from "@/components/atlas-agent";
import { DashboardContent } from "@/components/dashboard-content";
import { HeaderTitle } from "@/components/header-title";
import { ModeToggle } from "@/components/mode-toggle";
import { AssistantPanelProvider } from "@/hooks/use-assistant-panel";

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
    <SidebarProvider className="h-svh overflow-hidden">
      <AssistantPanelProvider>
        <AppSidebar variant="inset" />
        <DashboardContent>
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
              <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator
                  orientation="vertical"
                  className="mr-2 data-vertical:h-4 data-vertical:self-auto"
                />
                <HeaderTitle />
              </div>
              <div className="flex items-center gap-2 px-4">
                <ModeToggle />
                <AgentButton />
              </div>
            </header>
            <Separator />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-y-auto">
              {children}
            </div>
          </SidebarInset>
        </DashboardContent>
        <AtlasAgent />
      </AssistantPanelProvider>
    </SidebarProvider>
  );
}
