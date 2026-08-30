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
import { Suggestions } from "@atlas/ui/components/agents/suggestions";
import { Button } from "@atlas/ui/components/button";
import { Kbd, KbdGroup } from "@atlas/ui/components/kbd";
import { cn } from "@atlas/ui/lib/utils";
import { BorderBeam } from "border-beam";
import type { EveMessage } from "eve/react";
import { SquarePen, User, XIcon } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";

import type { PendingSuggestions } from "@/components/atlas-agent-message";
import {
  AtlasAgentMessageBody,
  hasPendingInput,
  pendingSubagent,
  pendingSuggestions,
} from "@/components/atlas-agent-message";
import { ChatHistory } from "@/components/chat-history";
import { useAgentSidebarSync } from "@/hooks/use-agent-panel";
import { useEveChat } from "@/hooks/use-eve-chat";
import { useFollowUps } from "@/hooks/use-follow-ups";

const AGENT_NAME = "Flight Guardian";

const SUGGESTIONS = [
  "What can you help me with?",
  "Show me a summary of recent activity",
  "How do I get started?",
] as const;

const AVATAR_URL = `https://api.dicebear.com/10.x/notionists/svg?seed=${encodeURIComponent(AGENT_NAME)}`;

const AgentHeader = ({
  close,
  onDeleteConversation,
  onOpenConversation,
  onReset,
  showReset,
}: {
  close: () => void;
  onDeleteConversation: (sessionId: string) => Promise<void>;
  onOpenConversation: (sessionId: string) => Promise<void>;
  onReset: () => void;
  showReset: boolean;
}) => (
  <div className="flex h-16 shrink-0 items-center justify-between border-b px-4 transition-[height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-[48.5px]">
    <h2 className="font-semibold text-sm">{AGENT_NAME}</h2>
    <div className="flex items-center gap-1">
      <ChatHistory
        onDelete={onDeleteConversation}
        onOpen={onOpenConversation}
      />
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
  /**
   * A hop is the longest wait in the panel and the one that used to look like
   * nothing at all: the assistant message already has parts, so the ordinary
   * typing indicator stayed hidden while the whole request sat in another
   * agent's session. Naming the specialist turns dead air into progress.
   */
  const waitingOn = isBusy ? pendingSubagent(messages) : undefined;
  const waitingForAssistant =
    isBusy && (last?.role !== "assistant" || last.parts.length === 0);
  const showThinking = waitingForAssistant || waitingOn !== undefined;

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

        {showThinking ? (
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
                {waitingOn
                  ? `Asking ${waitingOn} — this one takes a moment…`
                  : "Thinking…"}
              </ThinkingShimmer>
            </MessageContent>
          </Message>
        ) : null}
      </MessageGroup>
    </MessageScroller>
  );
};

const AgentComposer = ({
  awaitingAnswer,
  draft,
  draftContext,
  errorMessage,
  generated,
  isBusy,
  isEmpty,
  isFullWidth,
  onStop,
  onSubmit,
  ready,
  setDraft,
  suggestions,
}: {
  awaitingAnswer: boolean;
  draft: string;
  draftContext: string;
  errorMessage?: string;
  generated: readonly string[];
  isBusy: boolean;
  isEmpty: boolean;
  isFullWidth: boolean;
  onStop: () => void;
  onSubmit: (text: string) => void;
  ready: boolean;
  setDraft: (text: string) => void;
  suggestions?: PendingSuggestions;
}) => {
  /**
   * The draft is the value. There is no second copy.
   *
   * This used to hold `value` in local state and copy `draft` into it during
   * render whenever the prop changed — derived state, kept in step by a
   * render-phase write. Two sources of truth for one string, and React counts
   * render-phase updates toward the update-depth limit, so a controlled
   * textarea in a panel that re-renders while the agent streams eventually
   * raised "Maximum update depth exceeded" from inside the textarea.
   *
   * One state, owned by the panel: staging a handoff writes it, typing writes
   * it, sending clears it. Nothing to synchronise, so nothing to loop.
   */
  const stagedRef = useRef({ draft, draftContext });

  useEffect(() => {
    stagedRef.current = { draft, draftContext };
  }, [draft, draftContext]);

  const handleSubmit = useCallback(
    (text: string) => {
      // The staged machine detail rides along with the message the traveller
      // actually sees. It is only theirs to send if they are still sending the
      // thing it was staged for — a retyped message is a different question.
      const { draft: staged, draftContext: context } = stagedRef.current;
      const unchanged = context !== "" && text.trim() === staged.trim();
      onSubmit(unchanged ? `${text}\n${context}` : text);
      setDraft("");
    },
    [onSubmit, setDraft]
  );

  return (
    <div className="flex shrink-0 flex-col gap-3 p-4">
      {/*
        Only when the agent asked nothing.
        

        Pills used to render for a live `ask_question` too, which put the same
        five options on screen twice — once as radio buttons in the card, once
        as pills underneath it. The card already carries its own input and
        submit, so it needs no help. These are for the far commoner case where
        the agent ended in prose and offered nothing at all.
        

        Sent straight away rather than parked in the box: a tap that then
        needs a second tap on Send is not one tap.
      */}
      {!(suggestions || isBusy || awaitingAnswer) && generated.length > 0 ? (
        <Suggestions
          items={generated.map((label) => ({ id: label, label }))}
          onSelect={(item) => handleSubmit(item.label)}
        />
      ) : null}
      {isEmpty ? (
        <>
          <div className="flex flex-col items-start gap-1.5">
            {SUGGESTIONS.map((suggestion) => (
              <button
                className="text-left text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline"
                key={suggestion}
                onClick={() => setDraft(suggestion)}
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
          onValueChange={setDraft}
          placeholder="Ask me anything..."
          value={draft}
        />
      </BorderBeam>
    </div>
  );
};

export const AtlasAgent = () => {
  const {
    isOpen,
    isFullWidth,
    closeAgent,
    draft,
    draftContext,
    mounted,
    setDraft,
  } = useAgentSidebarSync();
  const {
    actions: {
      cancel,
      deleteConversation,
      openConversation,
      reset,
      respond,
      send,
    },
    state: { error, messages, ready, status },
  } = useEveChat();

  const isBusy = status === "submitted" || status === "streaming";

  const handleSubmit = useCallback(
    (text: string) => {
      void send(text);
    },
    [send]
  );

  /**
   * A live question suppresses the generated pills entirely.
   *
   * The card it renders already states the choices and carries its own input,
   * so pills beneath it were the same options a second time. This also keeps
   * the model call from running for a turn nobody is waiting on an idea for.
   */
  const suggestions = pendingSuggestions(messages);
  // Any live question or approval silences the generated pills — including
  // freeform-only questions, which carry no options for `suggestions` to see.
  // The card has its own input; pills beside it are a second conversation.
  const awaitingAnswer = hasPendingInput(messages);
  const generated = useFollowUps(
    messages,
    !(isBusy || suggestions || awaitingAnswer)
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
            onDeleteConversation={deleteConversation}
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
              draftContext={draftContext}
              errorMessage={status === "error" ? error?.message : undefined}
              isBusy={isBusy}
              isEmpty={messages.length === 0}
              isFullWidth={isFullWidth}
              onStop={handleStop}
              onSubmit={handleSubmit}
              setDraft={setDraft}
              awaitingAnswer={awaitingAnswer}
              generated={generated}
              ready={ready}
              suggestions={suggestions}
            />
          </div>
        </div>
      </div>
    </aside>
  );
};
