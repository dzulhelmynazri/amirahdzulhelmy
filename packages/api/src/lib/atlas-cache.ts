/**
 * In-memory TTL cache for live Atlas lookups. The sandbox enforces
 * ORDER_QUERY_QPM (10 requests/minute) per credential, so repeated detail
 * sheet opens and client refetches must reuse recent responses instead of
 * re-querying Atlas. Identical in-flight requests are deduplicated and
 * failures are never cached, so recovery from a rate limit is one retry away.
 */
const LIVE_CACHE_TTL_MS = 30_000;

interface LiveCacheEntry {
  expiresAt: number;
  value: unknown;
}

const liveCache = new Map<string, LiveCacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

export const cachedAtlas = <T>(
  key: string,
  load: () => Promise<T>
): Promise<T> => {
  const entry = liveCache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return Promise.resolve(entry.value as T);
  }

  const pending = inflight.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  const promise = (async () => {
    try {
      const value = await load();
      liveCache.set(key, { expiresAt: Date.now() + LIVE_CACHE_TTL_MS, value });
      return value;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, promise);
  return promise;
};
