"use client";

import { Button } from "@atlas/ui/components/button";
import { Kbd, KbdGroup } from "@atlas/ui/components/kbd";
import { BorderBeam } from "border-beam";

import { useAgentSidebarSync } from "@/hooks/use-agent-panel";

export const AgentButton = () => {
  const { isOpen, toggleAgent } = useAgentSidebarSync();

  return (
    <BorderBeam size="pulse-inner" colorVariant="colorful" strength={0.7}>
      <Button
        aria-pressed={isOpen}
        onClick={() => toggleAgent(false)}
        variant="outline"
      >
        <span className="px-1">Agent</span>
        <KbdGroup aria-hidden="true">
          <Kbd>⌘</Kbd>
          <Kbd>I</Kbd>
        </KbdGroup>
      </Button>
    </BorderBeam>
  );
};
