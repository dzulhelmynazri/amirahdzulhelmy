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
        <ResizablePanel defaultSize="60%" minSize="25%">
          {children}
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize="40%" maxSize="75%" minSize={640}>
          <AtlasAgent />
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  }

  return <div className="hidden min-w-0 flex-1 lg:block">{children}</div>;
};

export const AgentLayout = ({ children }: { children: React.ReactNode }) => {
  const { isOpen, isFullWidth, toggleAgent } = useAgentSidebarSync();

  // ⌘I (macOS) / Ctrl+I toggles the side panel. Registered once here —
  // AtlasAgent is mounted twice (mobile overlay + desktop panel).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "i") {
        event.preventDefault();
        toggleAgent(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleAgent]);

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
