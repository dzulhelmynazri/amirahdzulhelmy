"use client";

import { Button } from "@atlas/ui/components/button";
import { Kbd, KbdGroup } from "@atlas/ui/components/kbd";
import { BorderBeam } from "border-beam";

import { useAssistantSidebarSync } from "@/hooks/use-assistant-panel";

export const AgentButton = () => {
  const { isOpen, toggleAssistant } = useAssistantSidebarSync();

  return (
    <BorderBeam size="pulse-inner" colorVariant="colorful" strength={0.7}>
      <Button
        aria-pressed={isOpen}
        onClick={() => toggleAssistant(false)}
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
