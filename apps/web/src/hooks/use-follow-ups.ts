"use client";

import { useQuery } from "@tanstack/react-query";
import type { EveMessage } from "eve/react";

import { trpc } from "@/utils/trpc";

/**
 * Generated next-move suggestions for the exchange on screen.
 *
 * The fallback for when the agent does not offer its own. It usually does not:
 * measured on both models, Flight Guardian ends a turn with a prose question
 * rather than an `ask_question`, while being able to quote the rule against
 * doing so. Prompt-level rules about tool calls turn out to be advice.
 *
 * Keyed on the exchange, so the same pair of messages never costs a second
 * call — reopening a conversation reads the cache rather than regenerating.
 */

const textOf = (message: EveMessage | undefined): string => {
  if (!message) {
    return "";
  }

  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => (part as { text: string }).text)
    .join("\n")
    .trim();
};

/** The user message that prompted the last assistant reply. */
const lastExchange = (
  messages: readonly EveMessage[]
): { assistantMessage: string; userMessage: string } | null => {
  const last = messages.at(-1);

  if (last?.role !== "assistant") {
    return null;
  }

  const assistantMessage = textOf(last);
  const userMessage = textOf(
    messages.findLast((message) => message.role === "user")
  );

  return assistantMessage && userMessage
    ? { assistantMessage, userMessage }
    : null;
};

export const useFollowUps = (
  messages: readonly EveMessage[],
  enabled: boolean
): string[] => {
  const exchange = lastExchange(messages);

  const { data } = useQuery({
    ...trpc.chat.followUps.queryOptions(
      exchange ?? { assistantMessage: "", userMessage: "" }
    ),
    enabled: enabled && exchange !== null,
    // The exchange cannot change once it has happened, so the answer cannot
    // either. Refetching would spend a model call to get the same three lines.
    gcTime: Number.POSITIVE_INFINITY,
    staleTime: Number.POSITIVE_INFINITY,
  });

  return data ?? [];
};
