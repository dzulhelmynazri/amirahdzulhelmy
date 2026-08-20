"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@atlas/ui/components/resizable";
import { useEffect } from "react";

import { AtlasAgent } from "@/components/atlas-agent";
import { useAgentSidebarSync } from "@/hooks/use-agent-panel";

/**
 * Splits the protected area into dashboard content and the docked agent
 * panel with a draggable divider on lg screens. The panel owns its width
 * (default 40%, never narrower than its 640px content). Below lg the agent
 * keeps its fixed overlay behavior, so the split renders nothing there and
 * the agent stays mounted for both cases.
 */
const DesktopLayout = ({
  children,
  isFullWidth,
  isOpen,
}: {
  children: React.ReactNode;
  isFullWidth: boolean;
  isOpen: boolean;
}) => {
  // Expanded mode: agent takes the whole content area.
  if (isOpen && isFullWidth) {
    return (
      <div className="hidden min-w-0 flex-1 lg:block">
        <AtlasAgent />
      </div>
    );
  }

  if (isOpen) {
    return (
      <ResizablePanelGroup className="hidden min-w-0 flex-1 lg:flex">
        <ResizablePanel className="flex flex-col" minSize="25%">
          {children}
        </ResizablePanel>
        <ResizableHandle className="bg-transparent" />
        <ResizablePanel defaultSize={550} maxSize="75%" minSize={550}>
          <AtlasAgent />
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  }

  return (
    <div className="hidden min-w-0 flex-1 flex-col lg:flex">{children}</div>
  );
};

export const AgentLayout = ({ children }: { children: React.ReactNode }) => {
  const { isOpen, isFullWidth, openAgent, toggleAgent } = useAgentSidebarSync();

  // ⌘O (macOS) / Ctrl+O opens the side panel.
  // ⌘I (macOS) / Ctrl+I toggles it.
  // Registered once here — AtlasAgent is mounted twice (mobile + desktop).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "o") {
        event.preventDefault();
        openAgent(true);
      } else if (key === "i") {
        event.preventDefault();
        toggleAgent(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openAgent, toggleAgent]);

  return (
    <>
      {/* Mobile: agent renders itself as a fixed overlay. */}
      <div className="contents lg:hidden">
        <AtlasAgent />
      </div>

      <DesktopLayout isFullWidth={isFullWidth} isOpen={isOpen}>
        {children}
      </DesktopLayout>
    </>
  );
};
