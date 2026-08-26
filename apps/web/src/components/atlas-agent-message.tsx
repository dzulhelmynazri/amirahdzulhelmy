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
    return part.approval.approved === false ? "denied" : "approving";
  }
  return "running";
};

const hitlCardStatus = (part: EveDynamicToolPart): ApprovalCardStatus => {
  if (part.state === "approval-requested") {
    return "pending";
  }
  if (part.state === "approval-responded") {
    return "submitting";
  }
  return "answered";
};

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
  void respond([payload]);
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
  const always = options.find((option) => option !== allow && option !== deny);
  return { allow, always, deny };
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
  const { allow, always, deny } = request
    ? optionByRole(request)
    : { allow: undefined, always: undefined, deny: undefined };

  return (
    <ToolApproval
      description={request?.prompt}
      onAlwaysAllow={
        pending && request && always
          ? () => respondToRequest(respond, request, always.id)
          : undefined
      }
      onApprove={
        pending && request
          ? () =>
              respondToRequest(
                respond,
                request,
                allow?.id,
                allow ? undefined : "approve"
              )
          : undefined
      }
      onDeny={
        pending && request
          ? () =>
              respondToRequest(
                respond,
                request,
                deny?.id,
                deny ? undefined : "deny"
              )
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
    respondToRequest(
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
      status={hitlCardStatus(part)}
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

const userText = (message: EveMessage): string =>
  message.parts
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("\n");

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
          {userText(message)}
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
