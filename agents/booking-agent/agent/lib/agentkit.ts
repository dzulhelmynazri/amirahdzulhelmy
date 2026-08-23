import { AgentMemory, addTelemetry } from "@upstash/agentkit-sdk";
import { Redis } from "@upstash/redis";
import type { SessionContext } from "eve/context";

const sanitizeId = (value: string): string => value.replaceAll(":", "_");

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
