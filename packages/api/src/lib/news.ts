/**
 * Trending aviation and travel disruption news, from GDELT.
 *
 * Deliberately separate from the alert board. An alert says "this concerns a
 * trip you have"; this says "this is happening in the world". Mixing them
 * would cost the board the only thing that makes it worth looking at, because
 * a row about Nepal on a screen belonging to someone flying to Singapore
 * teaches the reader that nothing there is about them.
 *
 * GDELT indexes published articles and returns the outlet that ran each one,
 * so nothing here is written by a model. It is a list of things that were
 * printed, with links, and the reader judges them.
 */

const GDELT_ENDPOINT = "https://api.gdeltproject.org/api/v2/doc/doc";

/** Only outlets that put their name on what they publish. */
const TRUSTED_DOMAINS = new Set([
  "abc.net.au",
  "aljazeera.com",
  "apnews.com",
  "bbc.co.uk",
  "bbc.com",
  "bernama.com",
  "bloomberg.com",
  "channelnewsasia.com",
  "cnn.com",
  "ft.com",
  "japantimes.co.jp",
  "koreaherald.com",
  "nikkei.com",
  "npr.org",
  "nytimes.com",
  "reuters.com",
  "scmp.com",
  "straitstimes.com",
  "theguardian.com",
  "thestar.com.my",
  "washingtonpost.com",
]);

/**
 * Scoped to disruption rather than travel generally.
 *
 * A feed of destination puff pieces would be noise on a page about what is
 * going wrong. These are the words that appear when a journey breaks.
 */
const QUERY = [
  '"flight cancelled"',
  '"flights cancelled"',
  '"airport closed"',
  '"airspace closed"',
  '"air traffic control"',
  '"volcanic ash"',
  '"typhoon" "flights"',
  '"earthquake" "airport"',
].join(" OR ");

const MAX_ITEMS = 8;
/**
 * GDELT rate-limits hard, and this card renders on every visit to /activity.
 * Fetching per request earns a 429 within minutes, so one call is shared for
 * fifteen minutes — headlines do not turn over faster than that anyway.
 */
const CACHE_MS = 900_000;

/**
 * The client batches tRPC calls, so this request shares an HTTP round trip
 * with `activity.list`. Left uncapped it held the alert board hostage: a
 * measured page load spent 10.8 seconds on `news.trending,activity.list`,
 * nearly all of it waiting on GDELT, while the board it was batched with had
 * been ready the whole time.
 *
 * Headlines are the least important thing on that page. Four seconds is more
 * than they are worth.
 */
const TIMEOUT_MS = 4000;

/**
 * A failure is cached too, for a shorter window.
 *
 * Only successes used to be remembered, so an unreachable GDELT cost every
 * single visit the full timeout — the slower it got, the more often it was
 * asked. One minute of remembering turns that back into one slow request.
 */
const FAILURE_CACHE_MS = 60_000;

export interface NewsItem {
  outlet: string;
  publishedAt: string;
  title: string;
  url: string;
}

interface GdeltArticle {
  domain?: string;
  seendate?: string;
  title?: string;
  url?: string;
}

const STAMP_LENGTH = 16;
const isDigits = (value: string): boolean =>
  value.length > 0 && [...value].every((char) => char >= "0" && char <= "9");

/**
 * GDELT stamps as `YYYYMMDDTHHMMSSZ`, which `Date` will not parse as-is.
 *
 * Sliced rather than matched: the readable regex needs named capture groups,
 * which this package's compile target does not allow.
 */
const toIso = (stamp: string): string | null => {
  const date = stamp.slice(0, 8);
  const time = stamp.slice(9, 15);

  if (
    stamp.length !== STAMP_LENGTH ||
    stamp[8] !== "T" ||
    !(isDigits(date) && isDigits(time))
  ) {
    return null;
  }

  const parsed = new Date(
    `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}Z`
  );

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const hostOf = (domain: string): string =>
  domain.replace(/^www\./u, "").toLowerCase();

/**
 * The last 24 hours, from named outlets only.
 *
 * Returns an empty list when the source cannot be reached. The caller shows
 * that as "could not load", never as "nothing is happening" — those are
 * different statements and only one of them is knowable from a failed fetch.
 */
let cached: { at: number; items: NewsItem[] } | null = null;
let failedAt: number | null = null;

export const trendingDisruptionNews = async (): Promise<NewsItem[]> => {
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return cached.items;
  }

  if (failedAt !== null && Date.now() - failedAt < FAILURE_CACHE_MS) {
    throw new Error("GDELT was unreachable a moment ago");
  }

  const query = new URLSearchParams({
    format: "json",
    maxrecords: "50",
    mode: "artlist",
    query: QUERY,
    sort: "datedesc",
    timespan: "24h",
  });

  let response: Response;

  try {
    response = await fetch(`${GDELT_ENDPOINT}?${query}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    failedAt = Date.now();
    throw error;
  }

  if (!response.ok) {
    failedAt = Date.now();
    throw new Error(`GDELT answered ${response.status}`);
  }

  failedAt = null;

  const body = (await response.json()) as { articles?: GdeltArticle[] };
  const seen = new Set<string>();
  const items: NewsItem[] = [];

  for (const article of body.articles ?? []) {
    const domain = hostOf(article.domain ?? "");
    const publishedAt = toIso(article.seendate ?? "");

    if (
      !(article.title && article.url && publishedAt) ||
      !TRUSTED_DOMAINS.has(domain) ||
      // The same story is syndicated across sections; one per outlet is enough.
      seen.has(domain)
    ) {
      continue;
    }

    seen.add(domain);
    items.push({
      outlet: domain,
      publishedAt,
      title: article.title,
      url: article.url,
    });

    if (items.length >= MAX_ITEMS) {
      break;
    }
  }

  cached = { at: Date.now(), items };

  return items;
};
