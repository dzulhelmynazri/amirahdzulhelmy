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
import { useQuery } from "@tanstack/react-query";
import { BorderBeam } from "border-beam";
import type { EveMessage } from "eve/react";
import { SquarePen, User, XIcon } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";

import type { PendingSuggestions } from "@/components/atlas-agent-message";
import {
  AtlasAgentMessageBody,
  hasApprovedPayment,
  hasPendingInput,
  hasVisibleBody,
  pendingSubagent,
  pendingSuggestions,
} from "@/components/atlas-agent-message";
import { ChatHistory } from "@/components/chat-history";
import { useAgentSidebarSync } from "@/hooks/use-agent-panel";
import { useEveChat } from "@/hooks/use-eve-chat";
import { useFollowUps } from "@/hooks/use-follow-ups";
import { trpc } from "@/utils/trpc";

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

/**
 * The receipt for a booking whose recap never arrived.
 *
 * Payment happens inside the booking subagent's session; when the stream to
 * this panel drops mid-run, the booking still completes server-side but the
 * closing message is lost. Rather than tell the traveller a session ended,
 * read the booking row the payment tool wrote and state what actually
 * happened — PNR, order, trip, and where the confirmation email went.
 */
const BookingReceipt = () => {
  const { data } = useQuery({
    ...trpc.booking.list.queryOptions(),
    refetchInterval: (query) =>
      query.state.data?.[0]?.status === "issued" ? false : 5000,
  });
  // Newest booking for this account. This component only mounts after a
  // payment was approved in this very conversation, so the freshest row is
  // that payment's booking.
  const latest = data?.[0];

  if (!latest) {
    return (
      <p className="text-muted-foreground text-sm">
        Payment approved — finalising the booking. The details will be on your
        Bookings page in a moment.
      </p>
    );
  }

  const contacts = latest.payload?.atlasConfirmationContacts;
  const email = Array.isArray(contacts) ? String(contacts[0] ?? "") : "";
  const issued = latest.status === "issued";
  const total =
    latest.totalAmount === null
      ? ""
      : ` · $${latest.totalAmount}${latest.currency === null ? "" : ` ${latest.currency}`}`;

  return (
    <div className="flex flex-col gap-1 text-sm">
      <p>
        ✅ Booked — PNR <span className="font-mono">{latest.pnr}</span> · order{" "}
        <span className="font-mono">{latest.orderNo}</span>
        {total}
      </p>
      <p>{issued ? "✅ Tickets issued" : "⏳ Tickets issuing"}</p>
      <p>✅ Itinerary saved — see the Trips page</p>
      {email ? <p>✅ Confirmation email sent to {email}</p> : null}
    </div>
  );
};

const AgentMessages = ({
  isBusy,
  messages,
  respond,
}: {
  isBusy: boolean;
  messages: readonly EveMessage[];
  respond: ReturnType<typeof useEveChat>["actions"]["respond"];
}) => {
  /**
   * A hop is the longest wait in the panel and the one that used to look like
   * nothing at all: the assistant message already has parts, so the ordinary
   * typing indicator stayed hidden while the whole request sat in another
   * agent's session. Naming the specialist turns dead air into progress.
   */
  const waitingOn = isBusy ? pendingSubagent(messages) : undefined;
  /**
   * Busy means visible, always.
   *
   * The old condition only showed the indicator before the first part arrived
   * or when a subagent hop was detectable — so a four-minute booking hop
   * rendered as "Completed 3 steps" and then nothing, which reads as a hang.
   * A turn that is running shows a line saying so for its whole duration; the
   * specialist is named when known, and honest about the wait either way.
   */
  const showThinking = isBusy;

  /**
   * A turn that ends with nothing to show — no reply text, no tool rows —
   * used to just go quiet: the working line disappeared and the transcript
   * looked dead. Say so instead, with the nudge that actually works.
   */
  const last = messages.at(-1);
  const endedSilently =
    !isBusy &&
    last !== undefined &&
    (last.role === "user" || !hasVisibleBody(last));
  // Silence after an approved payment is almost always a finished booking
  // whose recap was lost with the stream — show the receipt, not a shrug.
  const paidSilently = endedSilently && hasApprovedPayment(messages);

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
        {/*
          An empty assistant turn renders as a bare avatar next to blank
          space. Filter before mapping so `isLast` lands on a row that
          actually shows something.
        */}
        {messages.filter(hasVisibleBody).map((message, index, visible) => {
          const isLast = index === visible.length - 1;
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

        {endedSilently ? (
          <Message from="assistant" key="silent-end">
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
              {paidSilently ? (
                <BookingReceipt />
              ) : (
                <p className="text-muted-foreground text-sm">
                  That attempt ended without a reply. Say &ldquo;Proceed.&rdquo;
                  to pick it back up, or ask again.
                </p>
              )}
            </MessageContent>
          </Message>
        ) : null}

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
                  ? `Asking ${waitingOn} — this can take a few minutes…`
                  : "Working on it — a specialist hop can take a few minutes…"}
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
  onReset,
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
  onReset: () => void;
  onStop: () => void;
  onSubmit: (text: string) => void;
  ready: boolean;
  setDraft: (text: string) => void;
  suggestions?: PendingSuggestions;
}) => {
  /**
   * The textarea is uncontrolled. Typing re-renders nothing above it.
   *
   * Every controlled variant of this box eventually raised "Maximum update
   * depth exceeded" from inside the textarea. Local state synced from a prop
   * did it; so did binding it straight to the panel's draft, which routed
   * every keystroke through the layout-level context provider and re-rendered
   * the whole protected tree. The class of bug is the parent round-trip, so
   * the fix removes the round-trip: PromptInput keeps its own value, and a
   * staged handoff arrives by remount — `key={draft}` mounts a fresh input
   * with the draft as its defaultValue. Parents hear about the text exactly
   * once, on submit.
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
        <div className="flex items-center justify-between gap-3">
          <p className="text-destructive text-sm">{errorMessage}</p>
          {/*
            A dead session leaves the whole panel with nothing actionable —
            the fix is always the same, so put it next to the error instead
            of behind the pencil icon in the header.
          */}
          <Button onClick={onReset} size="sm" variant="outline">
            Start new chat
          </Button>
        </div>
      ) : null}
      <BorderBeam colorVariant="colorful" size="pulse-inner" strength={0.7}>
        <PromptInput
          aria-label="Message me"
          defaultValue={draft}
          disabled={!ready}
          key={draft}
          loading={isBusy}
          onStop={onStop}
          onSubmit={handleSubmit}
          placeholder="Ask me anything..."
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
    async (text: string) => {
      // A send that throws — dead session, network drop — used to take the
      // typed message with it: the box had already cleared. Put the text
      // back so the traveller retries instead of retyping.
      try {
        await send(text);
      } catch {
        setDraft(text);
      }
    },
    [send, setDraft]
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
              onReset={reset}
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
