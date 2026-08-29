import type { ToolContext } from "eve/tools";

/**
 * Records an agent-run search into the same fare_search history the /fares
 * page writes, so a search the AI ran shows up beside the manual ones and can
 * be replayed on the page. Rows are labeled `source: "agent"`.
 *
 * Best-effort by design: a history row is never worth failing a search over.
 */

interface FareSearchInput {
  adultNum: number;
  cabin?: string;
  childNum: number;
  currency?: string | null;
  fromCity: string;
  /** Compact `YYYYMMDD`, as Atlas takes it. */
  fromDate: string;
  infantNum: number;
  retDate?: string;
  toCity: string;
}

/** `YYYYMMDD` → `YYYY-MM-DD`, the format the fares page stores and renders. */
const isoFromCompact = (value: string): string =>
  value.length === 8
    ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
    : value;

/**
 * Same ownership rule as persistBooking: a verified better-auth user, or the
 * hand-set dev id, or nobody — in which case there is nothing to record.
 */
const resolveUserId = (context: ToolContext): string | null => {
  const auth = context.session.auth.current ?? context.session.auth.initiator;
  const isBetterAuthUser = auth?.authenticator.toLowerCase().includes("better");

  if (isBetterAuthUser && auth) {
    return auth.principalId;
  }
  return process.env.ATLAS_DEV_USER_ID ?? null;
};

export const persistFareSearch = async (
  context: ToolContext,
  input: FareSearchInput,
  resultCount: number,
  requestId?: string | null
): Promise<void> => {
  try {
    const userId = resolveUserId(context);
    if (!userId) {
      return;
    }

    const { db } = await import("@atlas/db");
    const { fareSearch } = await import("@atlas/db/schema/fares");

    await db.insert(fareSearch).values({
      adults: input.adultNum,
      cabin: input.cabin ?? "economy",
      children: input.childNum,
      currency: input.currency ?? "USD",
      departureDate: isoFromCompact(input.fromDate),
      destination: input.toCity,
      id: crypto.randomUUID(),
      infants: input.infantNum,
      origin: input.fromCity,
      requestId: requestId ?? null,
      resultCount,
      returnDate:
        input.retDate === undefined ? null : isoFromCompact(input.retDate),
      source: "agent",
      tripType: input.retDate === undefined ? "one-way" : "round-trip",
      userId,
    });
  } catch {
    // History is a nicety; the search result has already been produced.
  }
};
