import { auth } from "@atlas/auth";
import { Separator } from "@atlas/ui/components/separator";
import { SidebarInset, SidebarProvider } from "@atlas/ui/components/sidebar";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { ReactNode } from "react";

import { AgentButton } from "@/components/agent-button";
import { AgentLayout } from "@/components/agent-layout";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardContent } from "@/components/dashboard-content";
import { HeaderTitle } from "@/components/header-title";
import { ModeToggle } from "@/components/mode-toggle";
import { AgentPanelProvider } from "@/hooks/use-agent-panel";
import { EveChatProvider } from "@/hooks/use-eve-chat";

/**
 * Bounces anyone without a session, without holding up the page.
 *
 * Rendered inside Suspense and returning nothing, so the shell around it
 * paints while the session is read. This is a navigation gate, not the
 * security boundary: every page fetches its own data through tRPC or a server
 * action, and each of those authenticates independently. Nothing belonging to
 * a user renders before this resolves.
 */
const AuthGate = async () => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/auth");
  }

  return null;
};

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider className="h-svh overflow-hidden" defaultOpen={false}>
      <Suspense fallback={null}>
        <AuthGate />
      </Suspense>
      <AgentPanelProvider>
        <EveChatProvider>
          {/* Highlights the current route, so it reads the URL too. */}
          <Suspense fallback={null}>
            <AppSidebar variant="inset" />
          </Suspense>
          <AgentLayout>
            <DashboardContent>
              {/*
                `w-auto`, not the component's default `w-full`. `w-full` is
                `width: 100%` of the parent, and margins sit outside that width,
                so `w-full` plus `m-2` is a box 16px wider than the space it was
                given — 16px of overflow this element cannot see. As a flex
                child it stretches to fit anyway, minus its margins, which is
                what was wanted in the first place.
              */}
              <SidebarInset className="m-2 ml-2 min-h-0 w-auto rounded-xl shadow-sm md:ml-0 md:group-has-data-[state=collapsed]/sidebar-wrapper:ml-2 lg:rounded-r-none">
                <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                  <div className="flex items-center gap-2 px-4">
                    {/* Derives the breadcrumb from the URL, so it cannot be
                        prerendered. Isolated rather than letting one label
                        hold up the whole shell. */}
                    <Suspense fallback={<div className="h-5" />}>
                      <HeaderTitle />
                    </Suspense>
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
