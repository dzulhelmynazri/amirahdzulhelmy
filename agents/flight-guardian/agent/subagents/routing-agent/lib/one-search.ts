import { Redis } from "@upstash/redis";
import type { ToolContext } from "eve/tools";

/**
 * One *productive* search per turn, enforced rather than asked for.
 *
 * The instructions have said "run exactly one search per turn" since they were
 * written; measured runs ignored them — one spent 456k input tokens on seven
 * searches, another 1.1M on thirty-six. Every fare table a search returns
 * stays in context for every step after it.
 *
 * Productive is the load-bearing word: a search that found nothing has not
 * answered anything, so it does not claim the turn. The first version counted
 * attempts and turned an empty comparison into "there are no flights" on a
 * route with plenty.
 *
 * **The claim lives in Redis, not module state.** The first version kept a
 * module-scope Map, and a measured turn slipped five productive searches past
 * it: dev serves tools from more than one process, and serverless will not
 * even promise the same instance twice, so in-memory "state" is a per-process
 * coincidence. Redis is already wired for the memory tools; a claim is one
 * SETNX with a TTL. When Redis is unreachable the in-memory map still catches
 * the same-process case and the search proceeds — a booking must never fail
 * because a rate-guard's storage blinked.
 */

const SEARCH_TOOLS = new Set([
  "flight-search",
  "price-compare-search",
  "smart-search",
]);

/** Turns are minutes long; an hour of claim outlives any of them. */
const CLAIM_TTL_SECONDS = 3600;

const localClaims = new Map<string, string>();
const MAX_TRACKED_TURNS = 200;
const evictOldClaims = (): void => {
  if (localClaims.size < MAX_TRACKED_TURNS) {
    return;
  }
  const oldest = localClaims.keys().next().value;
  if (oldest !== undefined) {
    localClaims.delete(oldest);
  }
};

let redisClient: Redis | null = null;

const redis = (): Redis | null => {
  try {
    redisClient ??= Redis.fromEnv();
    return redisClient;
  } catch {
    return null;
  }
};

const keyOf = (context: ToolContext): string =>
  `atlas:one-search:${context.session.id}:${context.session.turn.id}`;

export class SecondSearchError extends Error {
  constructor(previous: string, attempted: string) {
    super(
      `\`${previous}\` already returned results this turn, so \`${attempted}\` is refused. Every search returns a full fare table and every table stays in context, so a second one multiplies the cost of one answer. Work from what ${previous} returned. If you need a different search, run it on the next turn.`
    );
    this.name = "SecondSearchError";
  }
}

/**
 * Claims the turn's search slot, or throws if it is already held.
 *
 * The claim happens *here*, before the search runs, and atomically (SETNX) —
 * not after the result comes back. A measured run showed why: the model
 * requests several searches in one batch, they execute concurrently, and
 * every one of them passed a check-then-record guard before any had recorded.
 * Five productive searches in one turn, guard "working" the whole time.
 *
 * An early claim can be wrong — the search may come back empty — so
 * `recordSearchResult` releases it in that case, and the batch that was
 * refused alongside it retries a step later against a free slot.
 */
export const assertFirstSearch = async (
  context: ToolContext,
  toolName: string
): Promise<void> => {
  if (!SEARCH_TOOLS.has(toolName)) {
    return;
  }

  const key = keyOf(context);
  const local = localClaims.get(key);

  if (local) {
    throw new SecondSearchError(local, toolName);
  }

  localClaims.set(key, toolName);
  evictOldClaims();

  const client = redis();

  if (!client) {
    return;
  }

  try {
    const claimed = await client.set(key, toolName, {
      ex: CLAIM_TTL_SECONDS,
      nx: true,
    });

    // Upstash returns null when NX found the key already set.
    if (claimed === null) {
      const holder = (await client.get<string>(key)) ?? "another search";
      localClaims.set(key, holder);
      throw new SecondSearchError(holder, toolName);
    }
  } catch (error) {
    if (error instanceof SecondSearchError) {
      throw error;
    }
    // Redis being unreachable is not a reason to block a search.
  }
};

/**
 * Atlas answers every search with `routings`, empty when it found nothing.
 * A shape we do not recognise counts as unproductive: better to allow one
 * search too many than to bar recovery from a response we misread.
 */
const foundSomething = (result: unknown): boolean => {
  if (typeof result !== "object" || result === null) {
    return false;
  }

  const { routings } = result as { routings?: unknown };

  return Array.isArray(routings) && routings.length > 0;
};

/**
 * Settles the early claim: keeps it when the search found routes, releases
 * it when the search came back empty — an empty answer has not answered
 * anything, and holding the slot for it would turn "nothing on that date"
 * into "no more searching this turn".
 */
export const recordSearchResult = async (
  context: ToolContext,
  toolName: string,
  result: unknown
): Promise<void> => {
  if (!SEARCH_TOOLS.has(toolName) || foundSomething(result)) {
    return;
  }

  const key = keyOf(context);

  if (localClaims.get(key) === toolName) {
    localClaims.delete(key);
  }

  try {
    const client = redis();
    // Release only our own claim; a GET-compare-DEL race here costs at most
    // one extra allowed search, which is the failure direction we prefer.
    if (client && (await client.get<string>(key)) === toolName) {
      await client.del(key);
    }
  } catch {
    // Unreachable Redis leaves the claim to its TTL.
  }
};
