"use client";

import type { AgentActivityItem } from "@atlas/ui/components/agents/agent-activity";
import { AgentActivity } from "@atlas/ui/components/agents/agent-activity";
import type { AgentCodeLanguage } from "@atlas/ui/components/agents/agent-code";
import { AgentCode } from "@atlas/ui/components/agents/agent-code";
import { ApprovalCard } from "@atlas/ui/components/agents/approval-card";
import type {
  ApprovalCardAnswers,
  ApprovalCardQuestion,
} from "@atlas/ui/components/agents/approval-card";
import type { CitationItem } from "@atlas/ui/components/agents/citations";
import { ThinkingShimmer } from "@atlas/ui/components/agents/loading-states/thinking-shimmer";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageGroup,
  MessageScroller,
} from "@atlas/ui/components/agents/message";
import type { MessageFrom } from "@atlas/ui/components/agents/message";
import {
  MessageBubble,
  MessageBubbleCollapsible,
  MessageBubbleContent,
} from "@atlas/ui/components/agents/message-bubble";
import { PromptInput } from "@atlas/ui/components/agents/prompt-input";
import { StreamingResponse } from "@atlas/ui/components/agents/streaming-response";
import { TodoList } from "@atlas/ui/components/agents/todo-list";
import type { TodoItem } from "@atlas/ui/components/agents/todo-list";
import {
  ToolResult,
  ToolResultOutput,
} from "@atlas/ui/components/agents/tool-result";
import { Button } from "@atlas/ui/components/button";
import { Kbd, KbdGroup } from "@atlas/ui/components/kbd";
import { cn } from "@atlas/ui/lib/utils";
import { BorderBeam } from "border-beam";
import { User, XIcon } from "lucide-react";
import Image from "next/image";
import { useCallback, useState } from "react";

import { useAgentSidebarSync } from "@/hooks/use-agent-panel";

const AGENT_NAME = "Flight Guardian";

const SUGGESTIONS = [
  "What can you help me with?",
  "Show me a summary of recent activity",
  "How do I get started?",
] as const;

const AVATAR_URL = `https://api.dicebear.com/10.x/notionists/svg?seed=${encodeURIComponent(AGENT_NAME)}`;

interface ChatMessage {
  activity?: AgentActivityItem[];
  approvalQuestions?: ApprovalCardQuestion[];
  code?: { code: string; language: AgentCodeLanguage };
  collapsible?: boolean;
  content: string;
  from: MessageFrom;
  id: string;
  kind?: "text" | "activity" | "tool" | "approval" | "todo";
  sources?: CitationItem[];
  todos?: TodoItem[];
  tool?: { action: string; target: string };
}

const DEMO_SOURCES: CitationItem[] = [
  {
    domain: "flightaware.com",
    id: "flight-data",
    title: "Live flight tracking",
    url: "https://flightaware.com",
  },
  {
    domain: "aviationweek.com",
    id: "disruption-report",
    title: "Disruption analysis",
    url: "https://aviationweek.com",
  },
];

const DEMO_TODOS: TodoItem[] = [
  { id: "t1", status: "completed", title: "Analyse flight patterns" },
  { id: "t2", status: "completed", title: "Identify disruption risks" },
  { id: "t3", status: "in-progress", title: "Prepare recovery options" },
];

const APPROVAL_QUESTIONS: ApprovalCardQuestion[] = [
  {
    allowCustom: true,
    customPlaceholder: "Describe another focus area…",
    id: "focus",
    options: [
      { label: "Booking experience", value: "booking" },
      { label: "Disruption recovery", value: "disruption" },
      { label: "Multi-modal journeys", value: "multi-modal" },
    ],
    title: "What should the first release focus on?",
  },
];

// Placeholder messages — demonstrates all beui component capabilities
const INITIAL_MESSAGES: ChatMessage[] = [
  {
    content:
      "I'm Flight Guardian. I watch your trips, detect disruptions, and help recover journeys. How can I help?",
    from: "assistant",
    id: "welcome",
    kind: "text",
  },
  {
    activity: [
      {
        content:
          "Mapping the trip recovery workflow and identifying failure points.",
        id: "reasoning-1",
        type: "text",
      },
      {
        content:
          "Cross-referencing disruption patterns with historical recovery data.",
        id: "reasoning-2",
        type: "text",
      },
      {
        id: "search",
        query: "flight disruption recovery patterns 2026",
        results: [
          { domain: "flightaware.com", id: "fa", title: "FlightAware" },
          { domain: "aviationweek.com", id: "aw", title: "Aviation Week" },
        ],
        type: "search",
      },
      {
        action: "read",
        id: "read",
        target: "trip-recovery-playbook.md",
        type: "tool",
      },
    ],
    content: "",
    from: "assistant",
    id: "activity",
    kind: "activity",
  },
  {
    code: {
      code: "bun test tests/a11y.test.tsx\n49 pass · 0 fail",
      language: "bash",
    },
    content: "Running accessibility suite",
    from: "assistant",
    id: "tool-result",
    kind: "tool",
    tool: { action: "terminal.run", target: "tests/a11y.test.tsx" },
  },
  {
    approvalQuestions: APPROVAL_QUESTIONS,
    content: "Before I prepare the launch update, a quick question:",
    from: "assistant",
    id: "approval",
    kind: "approval",
  },
  {
    content:
      "I've prepared a comprehensive launch readiness report covering accessibility, interaction flow, error recovery, and reduced-motion behavior.",
    from: "assistant",
    id: "long-response",
    kind: "text",
    sources: DEMO_SOURCES,
    todos: DEMO_TODOS,
  },
  {
    collapsible: true,
    content:
      "The release is ready for a focused rollout. The main conversation flow, keyboard navigation, error recovery, and reduced-motion behavior are all covered.\n\nI would keep advanced workflow controls out of this version. They add configuration without improving the first-run experience, and the usage data from this release will give us a better basis for those decisions.\n\nBefore publishing, run the accessibility suite once more and verify the streaming behavior with a long response on a smaller viewport.",
    from: "assistant",
    id: "collapsible",
    kind: "text",
  },
];

const AgentHeader = ({
  close,
}: {
  close: () => void;
  isFullWidth: boolean;
  toggleFullWidth: () => void;
}) => (
  <div className="flex h-16 shrink-0 items-center justify-between border-b px-4 transition-[height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-[48.5px]">
    <h2 className="font-semibold text-sm">{AGENT_NAME}</h2>
    <Button
      aria-label="Close agent"
      onClick={close}
      size="icon-sm"
      variant="ghost"
    >
      <XIcon />
    </Button>
  </div>
);

const renderToolResult = (msg: ChatMessage) => {
  if (!msg.tool) {
    return null;
  }
  return (
    <ToolResult
      collapseOnComplete={false}
      kind="terminal"
      maxHeight={150}
      status="success"
      title={msg.content}
      tool={msg.tool.action}
    >
      {msg.code ? (
        <AgentCode code={msg.code.code} language={msg.code.language} />
      ) : (
        <ToolResultOutput>{msg.content}</ToolResultOutput>
      )}
    </ToolResult>
  );
};

const renderAgentResponse = (msg: ChatMessage, isLast: boolean) => {
  if (msg.collapsible) {
    return (
      <StreamingResponse
        showActions={false}
        sources={msg.sources}
        status="complete"
      >
        <MessageBubbleCollapsible collapsedLines={3}>
          <p>{msg.content}</p>
        </MessageBubbleCollapsible>
      </StreamingResponse>
    );
  }

  return (
    <StreamingResponse
      showActions={!isLast}
      sources={msg.sources}
      status="complete"
    >
      {msg.content}
    </StreamingResponse>
  );
};

const renderBubble = (msg: ChatMessage, isAgent: boolean, isLast: boolean) => (
  <MessageBubble
    animateIn={isLast}
    variant={msg.from === "user" ? "solid" : "soft"}
  >
    <MessageBubbleContent>
      {msg.todos && msg.todos.length > 0 && (
        <TodoList className="mb-3" items={msg.todos} />
      )}
      {isAgent ? renderAgentResponse(msg, isLast) : msg.content}
    </MessageBubbleContent>
  </MessageBubble>
);

const renderMessageContent = (
  msg: ChatMessage,
  isAgent: boolean,
  isLast: boolean
) => {
  if (msg.kind === "activity" && msg.activity) {
    return (
      <AgentActivity
        collapseOnComplete
        contentType="mixed"
        items={msg.activity}
        maxHeight={220}
        status="complete"
      />
    );
  }

  if (msg.kind === "tool" && msg.tool) {
    return renderToolResult(msg);
  }

  if (msg.kind === "approval" && msg.approvalQuestions) {
    return (
      <ApprovalCard
        onSubmit={(_answers: ApprovalCardAnswers) => {
          /* wire to backend */
        }}
        questions={msg.approvalQuestions}
        result="Response recorded."
        status="answered"
      />
    );
  }

  return renderBubble(msg, isAgent, isLast);
};

const AgentMessages = ({
  isTyping,
  messages,
}: {
  isTyping: boolean;
  messages: ChatMessage[];
}) => {
  if (messages.length === 0 && !isTyping) {
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
      busy={isTyping}
      className="flex-1"
      followOutput
      followThreshold={56}
      label={`${AGENT_NAME} conversation`}
      navigation="rail"
      navigationLabel="Message navigation"
      smooth
    >
      <MessageGroup className="p-4">
        {messages.map((msg, index) => {
          const isLast = index === messages.length - 1;
          const isAgent = msg.from === "assistant";

          return (
            <Message animateIn={isLast} from={msg.from} key={msg.id}>
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
                {renderMessageContent(msg, isAgent, isLast)}
              </MessageContent>
            </Message>
          );
        })}

        {isTyping && (
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
        )}
      </MessageGroup>
    </MessageScroller>
  );
};

const AgentComposer = ({
  isEmpty,
  isFullWidth,
  onSubmit,
}: {
  isEmpty: boolean;
  isFullWidth: boolean;
  onSubmit: (text: string) => void;
}) => {
  const [value, setValue] = useState("");

  const handleSubmit = useCallback(
    (text: string) => {
      onSubmit(text);
      setValue("");
    },
    [onSubmit]
  );

  return (
    <div className="flex shrink-0 flex-col gap-3 p-4">
      {isEmpty && (
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
      )}
      <BorderBeam colorVariant="colorful" size="pulse-inner" strength={0.7}>
        <PromptInput
          aria-label="Message me"
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
  const { isOpen, isFullWidth, closeAgent, mounted, toggleAgent } =
    useAgentSidebarSync();

  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);

  const handleSubmit = useCallback((text: string) => {
    setMessages((prev) => [
      ...prev,
      { content: text, from: "user", id: `user-${Date.now()}` },
    ]);
    // Placeholder — wire to agent backend to produce a response
  }, []);

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
            isFullWidth={isFullWidth}
            toggleFullWidth={() => toggleAgent(!isFullWidth)}
          />

          <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-hidden">
            <AgentMessages isTyping={false} messages={messages} />
            <AgentComposer
              isEmpty={messages.length === 0}
              isFullWidth={isFullWidth}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      </div>
    </aside>
  );
};
