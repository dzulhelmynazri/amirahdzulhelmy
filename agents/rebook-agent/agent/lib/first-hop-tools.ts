import { defineState } from "eve/context";
import type { SessionContext } from "eve/context";
import type { DynamicResolveContext } from "eve/tools";

const DELEGATED_HOP_PREFIX = 'You are the subagent "';

const hopGate = defineState(
  "rebook-agent.first-hop-gate",
  (): { omitExtraSearchTools: boolean } => ({
    omitExtraSearchTools: false,
  })
);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const textFromPart = (part: unknown): string | null => {
  if (!isRecord(part) || part.type !== "text") {
    return null;
  }
  return typeof part.text === "string" ? part.text : null;
};

const messageTexts = (message: Record<string, unknown>): string[] => {
  const { content } = message;
  if (typeof content === "string") {
    return [content];
  }
  if (!Array.isArray(content)) {
    return [];
  }
  return content.flatMap((part) => {
    const text = textFromPart(part);
    return text === null ? [] : [text];
  });
};

const isFirstDelegatedHopFromMessages = (
  ctx: DynamicResolveContext
): boolean => {
  let sawDelegatedTask = false;
  let sawAssistant = false;

  for (const message of ctx.messages) {
    if (!isRecord(message) || typeof message.role !== "string") {
      continue;
    }
    if (message.role === "assistant") {
      sawAssistant = true;
      continue;
    }
    if (message.role !== "user") {
      continue;
    }
    if (
      messageTexts(message).some((text) =>
        text.startsWith(DELEGATED_HOP_PREFIX)
      )
    ) {
      sawDelegatedTask = true;
    }
  }

  return sawDelegatedTask && !sawAssistant;
};

export const syncHopGateFromSession = (ctx: SessionContext): void => {
  hopGate.update(() => ({
    omitExtraSearchTools:
      ctx.session.parent !== undefined && ctx.session.turn.sequence === 0,
  }));
};

const isOmittedBySession = (): boolean => {
  try {
    return hopGate.get().omitExtraSearchTools;
  } catch {
    return false;
  }
};

/**
 * Hide extra search/lookup tools on the first delegated hop.
 * Local children expose `session.parent`; remote children wrap the first
 * user message with {@link DELEGATED_HOP_PREFIX} instead.
 */
export const shouldOmitExtraSearchTools = (
  ctx: DynamicResolveContext
): boolean => isOmittedBySession() || isFirstDelegatedHopFromMessages(ctx);
