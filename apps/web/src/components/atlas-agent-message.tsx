"use client";

import type { AgentActivityItem } from "@atlas/ui/components/agents/agent-activity";
import { AgentActivity } from "@atlas/ui/components/agents/agent-activity";
import { ApprovalCard } from "@atlas/ui/components/agents/approval-card";
import type {
  ApprovalCardAnswers,
  ApprovalCardStatus,
} from "@atlas/ui/components/agents/approval-card";
import { Markdown } from "@atlas/ui/components/agents/markdown";
import {
  MessageBubble,
  MessageBubbleContent,
} from "@atlas/ui/components/agents/message-bubble";
import { StreamingResponse } from "@atlas/ui/components/agents/streaming-response";
import {
  ToolApproval,
  ToolApprovalCode,
} from "@atlas/ui/components/agents/tool-approval";
import type { ToolApprovalStatus } from "@atlas/ui/components/agents/tool-approval";
import {
  ToolResult,
  ToolResultOutput,
} from "@atlas/ui/components/agents/tool-result";
import type { ToolResultStatus } from "@atlas/ui/components/agents/tool-result";
import type {
  EveAuthorizationPart,
  EveDynamicToolPart,
  EveMessage,
  EveMessageData,
  EveMessageInputRequest,
  EveMessagePart,
  UseEveAgentHelpers,
} from "eve/react";
import { useCallback, useEffect } from "react";
import type { ReactNode } from "react";

type RespondFn = UseEveAgentHelpers<EveMessageData>["respond"];

const formatUnknown = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  if (value === undefined || value === null) {
    return "";
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const toolParameters = (input: unknown) => {
  if (input === undefined) {
    return [];
  }
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return [
      {
        id: "input",
        label: "Input",
        value: <ToolApprovalCode code={formatUnknown(input)} language="json" />,
      },
    ];
  }
  return Object.entries(input as Record<string, unknown>).map(
    ([key, value]) => ({
      id: key,
      label: key,
      value: <ToolApprovalCode code={formatUnknown(value)} language="json" />,
    })
  );
};

const toolResultStatus = (part: EveDynamicToolPart): ToolResultStatus => {
  if (part.state === "output-available") {
    return part.partial ? "running" : "success";
  }
  if (part.state === "output-error") {
    return "error";
  }
  if (part.state === "output-denied") {
    return "cancelled";
  }
  return "running";
};

const toolApprovalStatus = (part: EveDynamicToolPart): ToolApprovalStatus => {
  if (part.state === "approval-requested") {
    return "pending";
  }
  if (part.state === "output-denied") {
    return "denied";
  }
  if (part.state === "output-error") {
    return "error";
  }
  if (part.state === "output-available") {
    return "complete";
  }
  if (part.state === "approval-responded") {
    /**
     * Answered means answered — not an eternal spinner.
     *
     * A gated tool inside a subagent runs in the subagent's session, so this
     * transcript never receives the completion event; mapping an approved
     * response to "approving" left every booking's cards spinning forever,
     * long after the PNR was on screen. The approval is the thing this card
     * records, and it has happened.
     */
    return part.approval.approved === false ? "denied" : "approved";
  }
  return "running";
};

/**
 * A question is finished the moment it is answered.
 *
 * `ask_question` has no `execute`: nothing runs after the response, so there
 * is no `output-available` for the part to move on to and it stays at
 * `approval-responded` for the rest of the session. Treating that as
 * "submitting" left every answered question spinning forever, while the
 * conversation carried on underneath them.
 *
 * A gated tool is different — something does run there, so `toolApprovalStatus`
 * keeps its spinner until the call returns.
 */
const questionCardStatus = (part: EveDynamicToolPart): ApprovalCardStatus =>
  part.state === "approval-requested" ? "pending" : "answered";

const toolOutput = (part: EveDynamicToolPart): string => {
  if (part.state === "output-error") {
    return part.errorText;
  }
  if (part.state === "output-available") {
    return formatUnknown(part.output);
  }
  return formatUnknown(part.input);
};

const toActivityItem = (
  part: EveDynamicToolPart,
  id: string
): AgentActivityItem => {
  const kind = part.toolMetadata?.eve?.kind;
  const name = part.toolMetadata?.eve?.name ?? part.toolName;
  if (kind === "subagent-call") {
    return {
      id,
      kind: "message",
      label: `Routing to ${name}`,
      type: "trace",
    };
  }
  if (kind === "load-skill") {
    return { action: "read", id, target: name, type: "tool" };
  }
  return { action: "run", id, target: name, type: "tool" };
};

const respondToRequest = (
  respond: RespondFn,
  request: EveMessageInputRequest,
  optionId?: string,
  text?: string
) => {
  const payload: {
    optionId?: string;
    requestId: string;
    text?: string;
  } = { requestId: request.requestId };
  if (optionId) {
    payload.optionId = optionId;
  }
  if (text) {
    payload.text = text;
  }
  // Returned, not voided: eve rejects a respond sent while a turn is still
  // processing, and a swallowed rejection surfaces as a runtime overlay crash.
  return respond([payload]);
};

/** Fire-and-forget respond that cannot crash on a busy turn. */
const respondQuietly = async (
  respond: RespondFn,
  request: EveMessageInputRequest,
  optionId?: string,
  text?: string
): Promise<void> => {
  try {
    await respondToRequest(respond, request, optionId, text);
  } catch {
    // "eve session is already processing a turn" — the tap simply did not
    // land; the card stays pending and the traveller taps again.
  }
};

const optionByRole = (request: EveMessageInputRequest) => {
  const options = request.options ?? [];
  const deny =
    options.find((option) => option.style === "danger") ??
    options.find((option) => option.id === "cancel" || option.id === "deny");
  const allow =
    options.find((option) => option.style === "primary") ??
    options.find((option) => option.id === "approve") ??
    options.find((option) => option !== deny);
  // No "always" here on purpose: eve sends approve and cancel and nothing
  // else, so looking for a third option only ever found undefined. Remembering
  // a tool is the client's decision now — see `alwaysAllowed`.
  return { allow, deny };
};

const AuthorizationPrompt = ({ part }: { part: EveAuthorizationPart }) => {
  if (part.state === "completed") {
    const connected =
      part.outcome === "authorized"
        ? `${part.displayName} connected.`
        : `${part.displayName} authorization ${part.outcome}.`;
    return <p className="text-muted-foreground text-sm">{connected}</p>;
  }

  return (
    <section className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm">
      <p className="font-medium">{part.displayName}</p>
      <p className="mt-1 text-muted-foreground">{part.description}</p>
      {part.authorization?.userCode ? (
        <code className="mt-2 block font-mono text-xs">
          {part.authorization.userCode}
        </code>
      ) : null}
      {part.authorization?.url ? (
        <a
          className="mt-2 inline-block font-medium underline underline-offset-4"
          href={part.authorization.url}
          rel="noopener noreferrer"
          target="_blank"
        >
          Sign in
        </a>
      ) : null}
    </section>
  );
};

/**
 * Tools the traveller has chosen not to be asked about again.
 *
 * eve sends two options with an approval — approve and cancel — so "always"
 * cannot come from the server; `optionByRole` was binding that button to a
 * third option that never existed, which is why it never rendered. This is the
 * client's own answer: pressing it approves now and answers the same tool
 * automatically for the rest of the page.
 *
 * Module scope so it survives the panel remounting mid-conversation, and
 * deliberately not persisted — a fresh visit asks again. Pre-authorising a
 * refund forever is not something a page reload should quietly inherit.
 */
const alwaysAllowed = new Set<string>();

/** Approval requests already answered, so an auto-approve fires once. */
const autoAnswered = new Set<string>();

/**
 * Failed auto-approve attempts per request. Retrying on the next render is
 * right when the session is merely mid-turn, and an infinite loop when the
 * session is dead — every render retried, every retry failed with a state
 * update, and React raised "Maximum update depth exceeded" from the chat
 * hook. Three failures means this session is not going to take the answer;
 * the card stays pending for a manual tap.
 */
const autoAttempts = new Map<string, number>();
const MAX_AUTO_ATTEMPTS = 3;

const ApprovalHitl = ({
  part,
  request,
  respond,
}: {
  part: EveDynamicToolPart;
  request: EveMessageInputRequest | undefined;
  respond: RespondFn;
}) => {
  const name = part.toolMetadata?.eve?.name ?? part.toolName;
  const pending = part.state === "approval-requested";
  const { allow, deny } = request
    ? optionByRole(request)
    : { allow: undefined, deny: undefined };

  const approve = useCallback(async () => {
    if (!request) {
      return false;
    }
    try {
      await respondToRequest(
        respond,
        request,
        allow?.id,
        allow ? undefined : "approve"
      );
      return true;
    } catch {
      // "eve session is already processing a turn" — the stream has not
      // settled yet. The caller decides whether to retry.
      return false;
    }
  }, [allow, request, respond]);

  /**
   * Answers a remembered tool without waiting for a tap.
   *
   * Guarded on the request id rather than the tool name: the same tool asks
   * again on a later call, and each of those still needs an answer — it is
   * answering the *same* request twice that would double-run it.
   */
  useEffect(() => {
    if (
      !(pending && request) ||
      !alwaysAllowed.has(name) ||
      autoAnswered.has(request.requestId)
    ) {
      return;
    }

    const attempts = autoAttempts.get(request.requestId) ?? 0;
    if (attempts >= MAX_AUTO_ATTEMPTS) {
      return;
    }

    autoAnswered.add(request.requestId);
    autoAttempts.set(request.requestId, attempts + 1);
    const run = async () => {
      const ok = await approve();
      if (!ok) {
        // The session was mid-turn. A later render — and streaming produces
        // plenty — retries once the turn settles, up to the attempt cap.
        autoAnswered.delete(request.requestId);
      }
    };
    void run();
  }, [approve, name, pending, request]);

  return (
    <ToolApproval
      description={request?.prompt}
      onAlwaysAllow={
        pending && request
          ? () => {
              alwaysAllowed.add(name);
              void approve();
            }
          : undefined
      }
      onApprove={
        pending && request
          ? () => {
              void approve();
            }
          : undefined
      }
      onDeny={
        pending && request
          ? () => {
              void respondQuietly(
                respond,
                request,
                deny?.id,
                deny ? undefined : "deny"
              );
            }
          : undefined
      }
      parameters={toolParameters(part.input)}
      status={toolApprovalStatus(part)}
      title={request?.prompt ?? "Allow this tool to run?"}
      tool={name}
    />
  );
};

const QuestionHitl = ({
  part,
  request,
  respond,
}: {
  part: EveDynamicToolPart;
  request: EveMessageInputRequest;
  respond: RespondFn;
}) => {
  const pending = part.state === "approval-requested";
  const answered = !pending;

  const handleSubmit = (answers: ApprovalCardAnswers) => {
    const answer = answers[request.requestId];
    if (!answer) {
      return;
    }
    void respondQuietly(
      respond,
      request,
      answer.selected[0],
      answer.custom?.trim() || undefined
    );
  };

  return (
    <ApprovalCard
      onSubmit={pending ? handleSubmit : undefined}
      questions={[
        {
          allowCustom: Boolean(request.allowFreeform),
          customPlaceholder: "Type a response…",
          id: request.requestId,
          options: request.options?.map((option) => ({
            label: option.label,
            value: option.id,
          })),
          title: request.prompt,
        },
      ]}
      result={answered ? "Response recorded." : undefined}
      status={questionCardStatus(part)}
    />
  );
};

const ToolHitl = ({
  part,
  respond,
}: {
  part: EveDynamicToolPart;
  respond: RespondFn;
}) => {
  const request = part.toolMetadata?.eve?.inputRequest;
  if (!request || request.kind === "tool-approval") {
    return <ApprovalHitl part={part} request={request} respond={respond} />;
  }
  return <QuestionHitl part={part} request={request} respond={respond} />;
};

const CompletedTool = ({ part }: { part: EveDynamicToolPart }) => {
  const name = part.toolMetadata?.eve?.name ?? part.toolName;
  const output = toolOutput(part);
  const status = toolResultStatus(part);

  return (
    <ToolResult
      collapseOnComplete={status !== "running"}
      // Closed unless it is still working. `collapseOnComplete` only fires on
      // the running-to-finished transition, so a tool that was already done
      // when the message rendered — reopening a chat, or a call that returned
      // instantly — sat open showing `{"memories": []}` to nobody's benefit.
      defaultOpen={status === "running"}
      copyText={output}
      kind="custom"
      maxHeight={220}
      status={status}
      title={name}
      tool={part.toolName}
    >
      <ToolResultOutput language="json">{output}</ToolResultOutput>
    </ToolResult>
  );
};

const isTracePart = (part: EveMessagePart): part is EveDynamicToolPart =>
  part.type === "dynamic-tool" &&
  (part.state === "input-streaming" || part.state === "input-available");

export interface PendingSuggestions {
  items: { id: string; label: string }[];
  requestId: string;
}

/**
 * Next moves the agent offered, when it did not insist on one.
 *
 * `allowFreeform` is the signal, and it is the agent's own: it means "you do
 * not have to pick one of these", which is what separates a suggestion from a
 * question. Anything without it is a choice the turn is waiting on, and that
 * belongs in the card where it takes the width and states itself plainly.
 *
 * Nothing here is derived from the text of the reply. Guessing follow-ups from
 * an answer produces confident nonsense — a tap that leads somewhere the agent
 * cannot act is worse than no tap at all.
 */
/**
 * True while any question or approval is still waiting for an answer.
 *
 * Broader than `pendingSuggestions` on purpose. That extractor only sees
 * questions carrying options, and a freeform-only "where would you like to
 * fly?" card slipped past it — generated pills rendered underneath, and
 * tapping one sent a fresh message while the question stood, so the agent
 * asked the same thing twice. Any live request means the pills stay away.
 */
export const hasPendingInput = (messages: readonly EveMessage[]): boolean => {
  const last = messages.at(-1);

  if (last?.role !== "assistant") {
    return false;
  }

  return last.parts.some(
    (part) =>
      part.type === "dynamic-tool" && part.state === "approval-requested"
  );
};

export const pendingSuggestions = (
  messages: readonly EveMessage[]
): PendingSuggestions | undefined => {
  const last = messages.at(-1);

  if (last?.role !== "assistant") {
    return;
  }

  for (const part of last.parts.toReversed()) {
    if (part.type !== "dynamic-tool" || part.state !== "approval-requested") {
      continue;
    }

    const request = part.toolMetadata?.eve?.inputRequest;

    if (
      !request ||
      request.kind === "tool-approval" ||
      !request.allowFreeform
    ) {
      continue;
    }

    const items = (request.options ?? []).map((option) => ({
      id: option.id,
      label: option.label ?? option.id,
    }));

    if (items.length > 0) {
      return { items, requestId: request.requestId };
    }
  }
};

/**
 * The specialist currently being waited on, if any.
 *
 * A hop is the longest silence in the panel — the whole request is sitting in
 * another agent's session, which has its own model turns and its own tools.
 * The name was already on screen, but only as a trace line inside a collapsed
 * group, so from the outside it read as nothing happening.
 */
export const pendingSubagent = (
  messages: readonly EveMessage[]
): string | undefined => {
  const last = messages.at(-1);

  if (last?.role !== "assistant") {
    return;
  }

  for (const part of last.parts.toReversed()) {
    if (isTracePart(part) && part.toolMetadata?.eve?.kind === "subagent-call") {
      return part.toolMetadata.eve.name ?? part.toolName;
    }
  }
};

const isHitlPart = (part: EveMessagePart): part is EveDynamicToolPart =>
  part.type === "dynamic-tool" &&
  (part.state === "approval-requested" ||
    part.state === "approval-responded" ||
    part.state === "output-denied");

const isCompletedToolPart = (
  part: EveMessagePart
): part is EveDynamicToolPart =>
  part.type === "dynamic-tool" &&
  (part.state === "output-available" || part.state === "output-error");

const ActivityBlock = ({
  items,
  working,
}: {
  items: AgentActivityItem[];
  working: boolean;
}) => {
  if (items.length === 0) {
    return null;
  }
  return (
    <AgentActivity
      collapseOnComplete
      contentType="mixed"
      items={items}
      maxHeight={220}
      status={working ? "working" : "complete"}
    />
  );
};

const renderAssistantParts = (
  message: EveMessage,
  isLast: boolean,
  respond: RespondFn
): ReactNode[] => {
  const nodes: ReactNode[] = [];
  let activity: AgentActivityItem[] = [];
  let activityWorking = false;
  let activityKey = `${message.id}-activity-0`;

  const flushActivity = () => {
    if (activity.length === 0) {
      return;
    }
    nodes.push(
      <ActivityBlock
        items={activity}
        key={activityKey}
        working={activityWorking}
      />
    );
    activity = [];
    activityWorking = false;
    activityKey = `${message.id}-activity-${nodes.length}`;
  };

  for (const [index, part] of message.parts.entries()) {
    const key = `${message.id}-${index}`;

    if (part.type === "step-start") {
      continue;
    }

    if (part.type === "reasoning") {
      // Models emit empty reasoning parts around tool calls. Rendered, each
      // one becomes a "Thought for 0s" row that opens onto nothing — three of
      // them stacked above a single answer, all noise.
      if (part.text.trim()) {
        activity.push({ content: part.text, id: key, type: "text" });
      }
      activityWorking ||= part.state === "streaming";
      continue;
    }

    if (isTracePart(part)) {
      activity.push(toActivityItem(part, key));
      activityWorking ||= part.state === "input-streaming";
      continue;
    }

    flushActivity();

    if (part.type === "text") {
      const streaming = part.state === "streaming";
      nodes.push(
        <StreamingResponse
          copyText={part.text}
          key={key}
          showActions={isLast && !streaming}
          status={streaming ? "streaming" : "complete"}
        >
          <Markdown streaming={streaming}>{part.text}</Markdown>
        </StreamingResponse>
      );
      continue;
    }

    if (part.type === "authorization") {
      nodes.push(<AuthorizationPrompt key={key} part={part} />);
      continue;
    }

    if (isHitlPart(part)) {
      nodes.push(<ToolHitl key={key} part={part} respond={respond} />);
      continue;
    }

    if (isCompletedToolPart(part)) {
      nodes.push(<CompletedTool key={key} part={part} />);
    }
  }

  flushActivity();
  return nodes;
};

/**
 * What the traveller sees of their own message.
 *
 * The machine detail a fare handoff carries — `routingIdentifier`, an opaque
 * 80-character token — is stripped here as well as kept out of the composer.
 * The agent still receives it; showing it back reads as the app leaking its
 * own plumbing into a sentence someone supposedly wrote.
 */
const userText = (message: EveMessage): string =>
  message.parts
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("\n")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("routingIdentifier:"))
    .join("\n")
    .trimEnd();

/**
 * Whether a message renders anything at all.
 *
 * The model sometimes ends a failed turn with an empty reply — no text, no
 * tool rows, nothing. Rendered anyway, each one is a bare avatar floating
 * next to blank space. The parent checks this before mounting the row so an
 * empty turn leaves no trace.
 */
export const hasVisibleBody = (message: EveMessage): boolean => {
  if (message.role !== "assistant") {
    return true;
  }
  return message.parts.some((part) => {
    if (part.type === "text" || part.type === "reasoning") {
      return part.text.trim().length > 0;
    }
    return (
      part.type === "authorization" ||
      isTracePart(part) ||
      isHitlPart(part) ||
      isCompletedToolPart(part)
    );
  });
};

export const AtlasAgentMessageBody = ({
  isLast,
  message,
  respond,
}: {
  isLast: boolean;
  message: EveMessage;
  respond: RespondFn;
}) => {
  if (message.role === "user") {
    const files = message.parts.flatMap((part) =>
      part.type === "file" ? [part.filename ?? part.mediaType] : []
    );
    return (
      <MessageBubble animateIn={isLast} variant="solid">
        <MessageBubbleContent>
          {/*
            What the traveller typed, kept as they typed it. Rendered as one
            run-on paragraph before this: a pasted itinerary lost every line
            break, and an opaque routingIdentifier — one unbroken 80-character
            token — ran straight out of the bubble.
          */}
          <span className="block whitespace-pre-wrap [overflow-wrap:anywhere]">
            {userText(message)}
          </span>
          {files.length > 0 ? (
            <p className="mt-2 text-muted-foreground text-xs">
              {files.join(", ")}
            </p>
          ) : null}
        </MessageBubbleContent>
      </MessageBubble>
    );
  }

  const parts = renderAssistantParts(message, isLast, respond);
  if (parts.length === 0) {
    return null;
  }

  return <div className="flex flex-col gap-3">{parts}</div>;
};
