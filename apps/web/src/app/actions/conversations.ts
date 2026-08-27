"use server";

import { auth } from "@atlas/auth";
import { db } from "@atlas/db";
import { conversation } from "@atlas/db/schema/conversations";
import { and, desc, eq, lt } from "drizzle-orm";
import { headers } from "next/headers";

/**
 * Chat history for the agent panel.
 *
 * Every write is scoped to the signed-in user, so a session id alone can never
 * reach someone else's conversation.
 */

/** Chats kept per account. Older ones are pruned as new ones arrive. */
const HISTORY_LIMIT = 20;
const TITLE_LENGTH = 60;

export interface ConversationSummary {
  id: string;
  lastMessageAt: Date;
  sessionId: string;
  title: string;
}

const requireUserId = async (): Promise<string | undefined> => {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id;
};

/** The opening message, trimmed to a line. Nobody titles a chat by hand. */
const toTitle = (text: string): string => {
  const flat = text.replaceAll(/\s+/gu, " ").trim();

  if (flat.length <= TITLE_LENGTH) {
    return flat || "New chat";
  }

  const cut = flat.slice(0, TITLE_LENGTH);
  const boundary = cut.lastIndexOf(" ");

  return `${cut.slice(0, boundary > TITLE_LENGTH * 0.6 ? boundary : TITLE_LENGTH).trim()}…`;
};

export const listConversations = async (): Promise<ConversationSummary[]> => {
  const userId = await requireUserId();

  if (!userId) {
    return [];
  }

  try {
    return await db
      .select({
        id: conversation.id,
        lastMessageAt: conversation.lastMessageAt,
        sessionId: conversation.sessionId,
        title: conversation.title,
      })
      .from(conversation)
      .where(eq(conversation.userId, userId))
      .orderBy(desc(conversation.lastMessageAt))
      .limit(HISTORY_LIMIT);
  } catch {
    return [];
  }
};

/** The stored snapshot for one chat, or undefined if it is not this user's. */
export const getConversation = async (sessionId: string) => {
  const userId = await requireUserId();

  if (!userId) {
    return;
  }

  const rows = await db
    .select({ payload: conversation.payload, title: conversation.title })
    .from(conversation)
    .where(
      and(
        eq(conversation.sessionId, sessionId),
        eq(conversation.userId, userId)
      )
    )
    .limit(1)
    .catch(() => []);

  return rows[0];
};

/**
 * Drops everything past the newest `HISTORY_LIMIT` chats.
 *
 * A transcript is cheap but not free, and an unbounded table of them is a
 * privacy question nobody asked for: passport numbers and itineraries get
 * mentioned in these. Old ones leaving on their own is the safer default.
 */
const prune = async (userId: string) => {
  const [oldest] = await db
    .select({ lastMessageAt: conversation.lastMessageAt })
    .from(conversation)
    .where(eq(conversation.userId, userId))
    .orderBy(desc(conversation.lastMessageAt))
    .offset(HISTORY_LIMIT - 1)
    .limit(1);

  if (!oldest) {
    return;
  }

  await db
    .delete(conversation)
    .where(
      and(
        eq(conversation.userId, userId),
        lt(conversation.lastMessageAt, oldest.lastMessageAt)
      )
    );
};

export const saveConversation = async (input: {
  firstMessage?: string;
  payload: unknown;
  sessionId: string;
}): Promise<void> => {
  const userId = await requireUserId();

  if (!userId) {
    return;
  }

  try {
    const now = new Date();
    const existing = await getConversation(input.sessionId);

    if (existing) {
      await db
        .update(conversation)
        .set({ lastMessageAt: now, payload: input.payload, updatedAt: now })
        .where(
          and(
            eq(conversation.sessionId, input.sessionId),
            eq(conversation.userId, userId)
          )
        );
      return;
    }

    await db.insert(conversation).values({
      id: crypto.randomUUID(),
      lastMessageAt: now,
      payload: input.payload,
      sessionId: input.sessionId,
      title: toTitle(input.firstMessage ?? ""),
      userId,
    });

    await prune(userId);
  } catch {
    // Losing history must never break the chat that produced it.
  }
};

export const removeConversation = async (sessionId: string): Promise<void> => {
  const userId = await requireUserId();

  if (!userId) {
    return;
  }

  try {
    await db
      .delete(conversation)
      .where(
        and(
          eq(conversation.sessionId, sessionId),
          eq(conversation.userId, userId)
        )
      );
  } catch {
    // Removing history is best effort; nothing downstream depends on it.
  }
};
