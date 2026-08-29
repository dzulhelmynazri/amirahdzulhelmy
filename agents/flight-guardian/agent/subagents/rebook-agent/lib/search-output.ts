import { normalizeRoutings } from "@atlas/atlas-client/fare-compare/normalize";

/**
 * The condensed view every search tool returns to the model.
 *
 * `flight-search` has normalized and capped its output for a while;
 * `smart-search` and `price-compare-search` returned the raw Atlas payload —
 * every routing, every nested segment, uncapped. Each fare table a tool
 * returns stays in the conversation for every step after it, so raw payloads
 * were the single largest line in a booking turn's token bill: the run that
 * cost 456k input tokens was mostly this.
 *
 * The model needs enough to rank and to choose — price, airline, times,
 * baggage, and the opaque `routingIdentifier` the next tool requires. It does
 * not need forty raw segment objects to do either.
 */

const MAX_FARES_RETURNED = 20;

export interface SearchToolInput {
  adultNum?: number;
  airlines?: string[];
  childNum?: number;
  currency?: string | null;
  fromCity?: string;
  fromDate?: string;
  infantNum?: number;
  retDate?: string;
  toCity?: string;
}

interface AtlasSearchResponse {
  msg: string | null;
  routings?: unknown;
  status: number;
}

/**
 * Cheapest-first, top twenty, named fields only.
 *
 * A non-zero status returns just the status and message: Atlas's own words,
 * with nothing for the model to mistake for results.
 */
export const condenseSearch = (
  input: SearchToolInput,
  response: AtlasSearchResponse
) => {
  if (response.status !== 0) {
    return { msg: response.msg, status: response.status };
  }

  const fares = normalizeRoutings(response.routings, {
    airlines: input.airlines ?? [],
    departureDate: input.fromDate ?? "",
    destination: input.toCity ?? "",
    id: `${input.fromCity ?? "?"}-${input.toCity ?? "?"}`,
    origin: input.fromCity ?? "",
    passengers: {
      adults: input.adultNum ?? 1,
      children: input.childNum ?? 0,
      infants: input.infantNum ?? 0,
    },
    ...(input.retDate === undefined ? {} : { returnDate: input.retDate }),
    ...(input.currency ? { currency: input.currency } : {}),
  });

  // `toSorted` is not in this lib target; the copy keeps the sort non-mutating.
  // oxlint-disable-next-line unicorn/no-array-sort
  const cheapestFirst = [...fares].sort((a, b) => a.adultTotal - b.adultTotal);

  return {
    fares: cheapestFirst.slice(0, MAX_FARES_RETURNED).map((fare) => ({
      adultTotal: fare.adultTotal,
      airline: fare.airline,
      baggage: fare.baggage.description,
      cabin: fare.cabin,
      currency: fare.currency,
      // Opaque token the downstream verify/order tools require.
      outbound: fare.outbound,
      routingIdentifier: fare.routingIdentifier,
      sellable: fare.sellable,
      ...(fare.inbound === undefined ? {} : { inbound: fare.inbound }),
    })),
    returned: Math.min(cheapestFirst.length, MAX_FARES_RETURNED),
    totalFound: fares.length,
  };
};
