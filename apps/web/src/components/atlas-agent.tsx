"use client";

import { ThinkingShimmer } from "@atlas/ui/components/agents/loading-states/thinking-shimmer";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageGroup,
  MessageScroller,
} from "@atlas/ui/components/agents/message";
import { PromptInput } from "@atlas/ui/components/agents/prompt-input";
import { Button } from "@atlas/ui/components/button";
import { Kbd, KbdGroup } from "@atlas/ui/components/kbd";
import { cn } from "@atlas/ui/lib/utils";
import { BorderBeam } from "border-beam";
import type { EveMessage } from "eve/react";
import { SquarePen, User, XIcon } from "lucide-react";
import Image from "next/image";
import { useCallback, useState } from "react";

import { AtlasAgentMessageBody } from "@/components/atlas-agent-message";
import { ChatHistory } from "@/components/chat-history";
import { useAgentSidebarSync } from "@/hooks/use-agent-panel";
import { useEveChat } from "@/hooks/use-eve-chat";

const AGENT_NAME = "Flight Guardian";

const SUGGESTIONS = [
  "What can you help me with?",
  "Show me a summary of recent activity",
  "How do I get started?",
] as const;

const AVATAR_URL = `https://api.dicebear.com/10.x/notionists/svg?seed=${encodeURIComponent(AGENT_NAME)}`;

const AgentHeader = ({
  close,
  onOpenConversation,
  onReset,
  showReset,
}: {
  close: () => void;
  onOpenConversation: (sessionId: string) => Promise<void>;
  onReset: () => void;
  showReset: boolean;
}) => (
  <div className="flex h-16 shrink-0 items-center justify-between border-b px-4 transition-[height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-[48.5px]">
    <h2 className="font-semibold text-sm">{AGENT_NAME}</h2>
    <div className="flex items-center gap-1">
      <ChatHistory onOpen={onOpenConversation} />
      {showReset ? (
        <Button
          aria-label="Start a new conversation"
          onClick={onReset}
          size="icon-sm"
          variant="ghost"
        >
          <SquarePen />
        </Button>
      ) : null}
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

const AgentMessages = ({
  isBusy,
  messages,
  respond,
}: {
  isBusy: boolean;
  messages: readonly EveMessage[];
  respond: ReturnType<typeof useEveChat>["actions"]["respond"];
}) => {
  const last = messages.at(-1);
  const waitingForAssistant =
    isBusy && (last?.role !== "assistant" || last.parts.length === 0);

  if (messages.length === 0 && !isBusy) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h3 className="font-semibold text-base">{AGENT_NAME}</h3>
        <p className="text-muted-foreground text-sm">
          Watching your trips. Ready to act.
        </p>
      </div>
    );
  }

  return (
    <MessageScroller
      busy={isBusy}
      className="flex-1"
      followOutput
      followThreshold={56}
      label={`${AGENT_NAME} conversation`}
      navigation="rail"
      navigationLabel="Message navigation"
      smooth
    >
      <MessageGroup className="p-4">
        {messages.map((message, index) => {
          const isLast = index === messages.length - 1;
          const isAgent = message.role === "assistant";

          return (
            <Message animateIn={isLast} from={message.role} key={message.id}>
              <MessageAvatar>
                {isAgent ? (
                  <Image
                    alt={AGENT_NAME}
                    className="rounded-sm!"
                    height={28}
                    src={AVATAR_URL}
                    unoptimized
                    width={28}
                  />
                ) : (
                  <User />
                )}
              </MessageAvatar>
              <MessageContent>
                <AtlasAgentMessageBody
                  isLast={isLast}
                  message={message}
                  respond={respond}
                />
              </MessageContent>
            </Message>
          );
        })}

        {waitingForAssistant ? (
          <Message from="assistant" key="typing">
            <MessageAvatar>
              <Image
                alt={AGENT_NAME}
                className="rounded-sm!"
                height={28}
                src={AVATAR_URL}
                unoptimized
                width={28}
              />
            </MessageAvatar>
            <MessageContent>
              <ThinkingShimmer className="text-sm" duration={1.8}>
                Thinking…
              </ThinkingShimmer>
            </MessageContent>
          </Message>
        ) : null}
      </MessageGroup>
    </MessageScroller>
  );
};

const AgentComposer = ({
  draft,
  errorMessage,
  isBusy,
  isEmpty,
  isFullWidth,
  onStop,
  onSubmit,
  ready,
}: {
  draft: string;
  errorMessage?: string;
  isBusy: boolean;
  isEmpty: boolean;
  isFullWidth: boolean;
  onStop: () => void;
  onSubmit: (text: string) => void;
  ready: boolean;
}) => {
  const [value, setValue] = useState("");
  const [lastDraft, setLastDraft] = useState(draft);

  // Adjusting state during render is React's own pattern for deriving from a
  // changed prop — cheaper and less surprising than an effect that fires after
  // the panel has already painted an empty box.
  if (draft !== lastDraft) {
    setLastDraft(draft);
    if (draft !== "") {
      setValue(draft);
    }
  }

  const handleSubmit = useCallback(
    (text: string) => {
      onSubmit(text);
      setValue("");
    },
    [onSubmit]
  );

  return (
    <div className="flex shrink-0 flex-col gap-3 p-4">
      {isEmpty ? (
        <>
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
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            Tips:
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>{isFullWidth ? "I" : "O"}</Kbd>
            </KbdGroup>
            <span>{isFullWidth ? "to close" : "for full width"}</span>
          </div>
        </>
      ) : null}
      {errorMessage ? (
        <p className="text-destructive text-sm">{errorMessage}</p>
      ) : null}
      <BorderBeam colorVariant="colorful" size="pulse-inner" strength={0.7}>
        <PromptInput
          aria-label="Message me"
          disabled={!ready}
          loading={isBusy}
          onStop={onStop}
          onSubmit={handleSubmit}
          onValueChange={setValue}
          placeholder="Ask me anything..."
          value={value}
        />
      </BorderBeam>
    </div>
  );
};

export const AtlasAgent = () => {
  const { isOpen, isFullWidth, closeAgent, draft, mounted, setDraft } =
    useAgentSidebarSync();
  const {
    actions: { cancel, openConversation, reset, respond, send },
    state: { error, messages, ready, status },
  } = useEveChat();

  const isBusy = status === "submitted" || status === "streaming";

  const handleSubmit = useCallback(
    (text: string) => {
      setDraft("");
      void send(text);
    },
    [send, setDraft]
  );

  const handleStop = useCallback(() => {
    void cancel();
  }, [cancel]);

  return (
    <aside
      aria-hidden={!isOpen}
      aria-label={AGENT_NAME}
      className={cn(
        "flex shrink-0 flex-col overflow-hidden",
        mounted && "transition-transform duration-200 ease-in-out",
        // Mobile: fixed overlay sliding in from the right.
        "fixed inset-y-0 right-0 z-50 w-full",
        isFullWidth ? "" : "max-w-[640px]",
        isOpen ? "translate-x-0" : "translate-x-full",
        // Desktop: fills whatever container renders it — the resizable panel
        // (split mode) or the full-width wrapper (expanded mode).
        "lg:static lg:h-full lg:max-w-none lg:translate-x-0"
      )}
    >
      <div
        className={cn(
          "flex h-full w-full min-w-0 flex-col overflow-hidden p-2 lg:pl-0",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        <div
          className={cn(
            "flex flex-1 flex-col overflow-hidden rounded-xl bg-background shadow-sm",
            !isFullWidth && "lg:rounded-l-none lg:border-l lg:border-border"
          )}
        >
          <AgentHeader
            close={closeAgent}
            onOpenConversation={openConversation}
            onReset={reset}
            showReset={messages.length > 0}
          />

          <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-hidden">
            <AgentMessages
              isBusy={isBusy}
              messages={messages}
              respond={respond}
            />
            <AgentComposer
              draft={draft}
              errorMessage={status === "error" ? error?.message : undefined}
              isBusy={isBusy}
              isEmpty={messages.length === 0}
              isFullWidth={isFullWidth}
              onStop={handleStop}
              onSubmit={handleSubmit}
              ready={ready}
            />
          </div>
        </div>
      </div>
    </aside>
  );
};
