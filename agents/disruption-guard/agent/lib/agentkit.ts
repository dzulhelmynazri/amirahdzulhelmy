import type { ExtractedText } from "@upstash/agentkit-sdk";
import { AgentMemory, ChatHistory, addTelemetry } from "@upstash/agentkit-sdk";
import { Redis } from "@upstash/redis";
import type { SessionContext } from "eve/context";

const CHAT_HISTORY_TTL_SECONDS = 30 * 24 * 60 * 60;

const sanitizeId = (value: string): string => value.replaceAll(":", "_");

export interface ChatMessage {
  content: string;
  createdAt: number;
  role: string;
}

const extractText = (messages: ChatMessage[]): ExtractedText => {
  const userMessages: string[] = [];
  const modelMessages: string[] = [];
  for (const message of messages) {
    if (message.role === "assistant") {
      modelMessages.push(message.content);
    } else {
      userMessages.push(message.content);
    }
  }
  return {
    modelMessages: modelMessages.join("\n"),
    userMessages: userMessages.join("\n"),
  };
};

export const resolveUserId = (ctx: SessionContext): string => {
  const { session } = ctx;
  const { auth, id } = session;
  const principalId =
    auth.current?.principalId ?? auth.initiator?.principalId ?? id;
  return sanitizeId(principalId);
};

/**
 * Memory is optional infrastructure. When Upstash is not configured the agent
 * must still be able to search and book — losing recall is a degraded feature,
 * not a dead agent. Redis can also go down in production, so this is the right
 * behaviour either way.
 */
export const isMemoryConfigured = (): boolean =>
  Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );

let redisClient: Redis | null = null;

const redis = (): Redis => {
  redisClient ??= Redis.fromEnv();
  addTelemetry(redisClient, {
    enabled: !process.env.UPSTASH_DISABLE_TELEMETRY,
  });
  return redisClient;
};

let agentMemory: AgentMemory | null = null;

export const memory = (): AgentMemory => {
  agentMemory ??= new AgentMemory({ redis: redis() });
  return agentMemory;
};

let chats: ChatHistory<ChatMessage> | null = null;

export const chatHistory = (): ChatHistory<ChatMessage> => {
  chats ??= new ChatHistory<ChatMessage>({
    extractText,
    redis: redis(),
    ttlSeconds: CHAT_HISTORY_TTL_SECONDS,
  });
  return chats;
};

export const appendChatMessage = async (
  ctx: SessionContext,
  role: "user" | "assistant",
  content: string
): Promise<void> => {
  if (!content) {
    return;
  }
  const history = chatHistory();
  const userId = resolveUserId(ctx);
  const sessionId = sanitizeId(ctx.session.id);
  const existing = await history.getChat({ sessionId, userId });
  const messages = existing ? existing.messages : [];
  messages.push({ content, createdAt: Date.now(), role });
  await history.saveChat({
    messages,
    sessionId,
    userId,
    ...(existing?.title === undefined && role === "user"
      ? { title: content.slice(0, 80) }
      : {}),
  });
};
