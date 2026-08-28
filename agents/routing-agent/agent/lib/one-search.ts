import type { ToolContext } from "eve/tools";

/**
 * One *productive* search per turn, enforced rather than asked for.
 *
 * The instructions have said "run exactly one search per turn" since they were
 * written. Measured on a single "book the cheapest KL to Tokyo flight",
 * routing-agent ran seven searches in one turn and spent 456,151 input tokens,
 * because every fare table a search returns stays in context for the steps
 * after it. The traveller pays for that twice: in money and in the wait.
 *
 * Productive is the important word. The first version counted any search, and
 * it made things worse: `price-compare-search` returned an empty set, every
 * recovery attempt was refused, and the agent concluded there were no flights
 * at all on a route that has plenty. A search that found nothing has not spent
 * the budget — it has not answered anything yet.
 *
 * So the slot is claimed by results, not by attempts.
 */

const SEARCH_TOOLS = new Set([
  "flight-search",
  "price-compare-search",
  "smart-search",
]);

/**
 * Keyed by session and turn, so a follow-up turn searches freely. Bounded by
 * eviction on write rather than a timer: a stale key costs one map entry, and
 * the process holding it is the same one that will clear it.
 */
const productiveSearch = new Map<string, string>();
const MAX_TRACKED_TURNS = 200;

const keyOf = (context: ToolContext): string =>
  `${context.session.id}:${context.session.turn.id}`;

export class SecondSearchError extends Error {
  constructor(previous: string, attempted: string) {
    super(
      `\`${previous}\` already returned results this turn, so \`${attempted}\` is refused. Every search returns a full fare table and every table stays in context, so a second one multiplies the cost of one answer. Work from what ${previous} returned. If you need a different search, run it on the next turn.`
    );
    this.name = "SecondSearchError";
  }
}

/** Throws when a search has already returned results in this turn. */
export const assertFirstSearch = (
  context: ToolContext,
  toolName: string
): void => {
  if (!SEARCH_TOOLS.has(toolName)) {
    return;
  }

  const previous = productiveSearch.get(keyOf(context));

  if (previous) {
    throw new SecondSearchError(previous, toolName);
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
 * Records the search only if it actually returned routes.
 *
 * Call after the search, with its result. An empty answer leaves the slot
 * open so the next attempt — a wider date window, a different tool — is not
 * refused for a question nobody has answered yet.
 */
export const recordSearchResult = (
  context: ToolContext,
  toolName: string,
  result: unknown
): void => {
  if (!(SEARCH_TOOLS.has(toolName) && foundSomething(result))) {
    return;
  }

  if (productiveSearch.size >= MAX_TRACKED_TURNS) {
    const oldest = productiveSearch.keys().next().value;
    if (oldest !== undefined) {
      productiveSearch.delete(oldest);
    }
  }

  productiveSearch.set(keyOf(context), toolName);
};
