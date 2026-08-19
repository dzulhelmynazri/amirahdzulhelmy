"use client";

import { PromptInput } from "@atlas/ui/components/agents/prompt-input";
import { Button } from "@atlas/ui/components/button";
import { cn } from "@atlas/ui/lib/utils";
import { BorderBeam } from "border-beam";
import { Maximize2Icon, Minimize2Icon, XIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { useAssistantSidebarSync } from "@/hooks/use-assistant-panel";

const ASSISTANT_TITLE = "Flights & Aviation";

const SUGGESTIONS = [
  "What can you help me with?",
  "Show me a summary of recent activity",
  "How do I get started?",
] as const;

// Placeholder — will send the prompt once AI is wired
const handleSuggestion = (_text: string): void => {
  // noop until AI backend is integrated
};

const AVATAR_URL = `https://api.dicebear.com/10.x/moods/svg?seed=${encodeURIComponent(ASSISTANT_TITLE)}`;

const AgentHeader = ({
  close,
  isFullWidth,
  toggleFullWidth,
}: {
  close: () => void;
  isFullWidth: boolean;
  toggleFullWidth: () => void;
}) => (
  <div className="flex h-16 shrink-0 items-center justify-between border-b px-4 transition-[height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
    <div className="flex items-center gap-2.5">
      <Image
        alt={ASSISTANT_TITLE}
        className="size-7 rounded-md"
        height={28}
        src={AVATAR_URL}
        unoptimized
        width={28}
      />
      <h2 className="font-semibold text-sm">{ASSISTANT_TITLE}</h2>
    </div>
    <div className="flex items-center gap-1">
      <Button
        aria-label={isFullWidth ? "Collapse panel" : "Expand panel"}
        onClick={toggleFullWidth}
        size="icon-sm"
        variant="ghost"
      >
        {isFullWidth ? <Minimize2Icon /> : <Maximize2Icon />}
      </Button>
      <Button
        aria-label="Close agent"
        onClick={close}
        size="icon-sm"
        variant="ghost"
      >
        <XIcon />
      </Button>
    </div>
  </div>
);

const AgentEmptyState = () => (
  <div className="flex flex-1 flex-col items-center justify-center p-6">
    <div className="flex flex-col items-center gap-3 text-center">
      <h3 className="font-semibold text-base">Flight Guardian</h3>
      <p className="text-muted-foreground text-sm">
        Watching your trips. Ready to act.
      </p>
    </div>
  </div>
);

const AgentComposer = ({ onSubmit }: { onSubmit: (text: string) => void }) => {
  const [value, setValue] = useState("");

  return (
    <div className="flex shrink-0 flex-col gap-3 p-4">
      <div className="flex flex-col items-start gap-1.5">
        {SUGGESTIONS.map((suggestion) => (
          <button
            className="text-left text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline"
            key={suggestion}
            onClick={() => setValue(suggestion)}
            type="button"
          >
            {suggestion}
          </button>
        ))}
      </div>
      <BorderBeam size="pulse-inner" colorVariant="colorful" strength={0.7}>
        <PromptInput
          aria-label="Message me"
          onSubmit={(text) => {
            onSubmit(text);
            setValue("");
          }}
          onValueChange={setValue}
          placeholder="Ask me anything..."
          value={value}
        />
      </BorderBeam>
    </div>
  );
};

export const AtlasAgent = () => {
  const { isOpen, isFullWidth, closeAssistant, toggleAssistant } =
    useAssistantSidebarSync();

  // ⌘I (macOS) / Ctrl+I toggles the side panel.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "i") {
        event.preventDefault();
        toggleAssistant(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleAssistant]);

  return (
    <aside
      aria-hidden={!isOpen}
      aria-label={ASSISTANT_TITLE}
      className={cn(
        "flex shrink-0 flex-col overflow-hidden transition-[width,transform] duration-200 ease-in-out",
        "fixed inset-y-0 right-0 z-50 w-full",
        isFullWidth ? "" : "max-w-[640px]",
        "lg:sticky lg:top-0 lg:z-auto lg:h-svh lg:self-start lg:transition-[width]",
        isOpen ? "translate-x-0" : "translate-x-full lg:w-0 lg:translate-x-0",
        isOpen && isFullWidth ? "lg:w-full lg:flex-1" : "",
        isOpen && !isFullWidth ? "lg:w-[640px]" : ""
      )}
    >
      <div
        className={cn(
          "flex h-full w-full flex-col overflow-hidden p-2 lg:pl-0",
          isFullWidth ? "" : "min-w-[340px] lg:w-[640px] lg:min-w-[640px]",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        <div className="flex flex-1 flex-col overflow-hidden rounded-xl bg-background shadow-sm">
          <AgentHeader
            close={closeAssistant}
            isFullWidth={isFullWidth}
            toggleFullWidth={() => toggleAssistant(!isFullWidth)}
          />

          <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-hidden">
            <AgentEmptyState />
            <AgentComposer onSubmit={handleSuggestion} />
          </div>
        </div>
      </div>
    </aside>
  );
};
