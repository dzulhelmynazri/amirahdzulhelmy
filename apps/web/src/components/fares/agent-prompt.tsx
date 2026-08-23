"use client";

import { Button } from "@atlas/ui/components/button";
import { Sparkles } from "lucide-react";

import { useAgentSidebarSync } from "@/hooks/use-agent-panel";

/**
 * Offers the one thing this page genuinely cannot do: search a spread of dates
 * and destinations at once.
 */
export const AgentPrompt = () => {
  const { handOffToAgent } = useAgentSidebarSync();

  return (
    <div className="flex flex-col gap-4 rounded-2xl border bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="flex flex-col gap-0.5">
          <p className="font-medium">Not sure where or when?</p>
          <p className="text-muted-foreground text-sm">
            The agent can search several dates and destinations at once, which
            this form cannot.
          </p>
        </div>
      </div>
      <Button
        className="shrink-0 rounded-full"
        onClick={() =>
          handOffToAgent(
            "I'm flexible on dates. Help me find a good-value trip — ask me what I need and search a few options."
          )
        }
        type="button"
        variant="outline"
      >
        Ask the agent
      </Button>
    </div>
  );
};
