import { env } from "@atlas/env/server";

/**
 * Turns "KL to Tokyo next Friday, 2 adults" into fare-search criteria.
 *
 * This is the /fares page's AI mode: one text box instead of six fields. It
 * shares the follow-up pills' economics — a small gateway model, no
 * reasoning, a hard timeout — because a parse that costs more than the
 * search it saves is not a shortcut.
 */

const GATEWAY = "https://ai-gateway.vercel.sh/v1/chat/completions";
const MODEL = "inclusionai/ling-3.0-flash";
const REASONING_EFFORT = "none";
const MAX_TOKENS = 200;
const TIMEOUT_MS = 8000;

const IATA = /^[A-Z]{3}$/u;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;

export interface ParsedFareQuery {
  adults: number;
  children: number;
  departureDate: string;
  destination: string;
  origin: string;
  returnDate: string | null;
}

const systemPrompt = (allowed: string[]) =>
  `You convert a traveller's freeform flight request into search criteria.

Return ONLY a JSON object, no fences, with exactly these keys:
- "origin": one code from the allowed list below. Map cities to the airport that serves them ("KL"/"Kuala Lumpur" -> KUL, "Tokyo" -> HND, "Bali" -> DPS, "Saigon"/"Ho Chi Minh" -> SGN).
- "destination": same, and never the same as origin.
- "departureDate": "YYYY-MM-DD". Resolve relative dates ("next Friday", "early October") against today's date given in the message. Never pick a past date. When no date is given at all, choose one two weeks after today.
- "returnDate": "YYYY-MM-DD" or null for one-way. A stay length counts as a return: "3 nights" means returnDate is 3 days after departureDate.
- "adults": integer, default 1.
- "children": integer, default 0.

Allowed codes, and nothing else: ${allowed.join(", ")}.

If the request is not a flight search, or names a place with no airport in that list, return {"error":"<one short sentence naming what is missing or unsupported>"} instead.`;

/**
 * Why this route cannot be used, or null when it can.
 *
 * An unsupported airport is worth explaining — the traveller named a real
 * place we simply do not fly — while a malformed code is a model failure
 * with nothing useful to say, so it stays a null parse.
 */
const routeProblem = (
  origin: string,
  destination: string,
  allowed: string[]
): { error: string } | null => {
  const unsupported = [origin, destination].filter(
    (code) => !allowed.includes(code)
  );

  if (unsupported.length > 0) {
    return {
      error: `We do not cover ${unsupported.join(" or ")} yet — pick another airport, or ask the agent for a wider search.`,
    };
  }

  return origin === destination
    ? {
        error:
          "Origin and destination came out the same — try naming both cities.",
      }
    : null;
};

const parseReply = (
  raw: string,
  allowed: string[]
): ParsedFareQuery | { error: string } | null => {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Record<
      string,
      unknown
    >;

    if (typeof parsed.error === "string") {
      return { error: parsed.error };
    }

    const origin = String(parsed.origin ?? "").toUpperCase();
    const destination = String(parsed.destination ?? "").toUpperCase();
    const departureDate = String(parsed.departureDate ?? "");
    const returnDate =
      parsed.returnDate === null || parsed.returnDate === undefined
        ? null
        : String(parsed.returnDate);

    if (!(IATA.test(origin) && IATA.test(destination))) {
      return null;
    }

    // The page can only render airports it knows, so a code outside the list
    // would fill the form with nothing and look like a dead button.
    const problem = routeProblem(origin, destination, allowed);
    if (problem) {
      return problem;
    }
    if (!ISO_DATE.test(departureDate)) {
      return null;
    }
    if (returnDate !== null && !ISO_DATE.test(returnDate)) {
      return null;
    }

    const adults = Number(parsed.adults);
    const children = Number(parsed.children);

    return {
      adults: Number.isInteger(adults) && adults > 0 ? adults : 1,
      children: Number.isInteger(children) && children >= 0 ? children : 0,
      departureDate,
      destination,
      origin,
      returnDate,
    };
  } catch {
    return null;
  }
};

/**
 * Null means "could not parse" with no reason to give; an object with `error`
 * carries the model's own explanation of what was missing.
 */
export const parseFareQuery = async (
  query: string,
  todayIso: string,
  allowed: string[]
): Promise<ParsedFareQuery | { error: string } | null> => {
  const trimmed = query.slice(0, 500).trim();
  if (!trimmed) {
    return null;
  }

  try {
    const response = await fetch(GATEWAY, {
      body: JSON.stringify({
        max_tokens: MAX_TOKENS,
        messages: [
          { content: systemPrompt(allowed), role: "system" },
          {
            content: `Today is ${todayIso}.\n\nRequest: ${trimmed}`,
            role: "user",
          },
        ],
        model: MODEL,
        reasoning_effort: REASONING_EFFORT,
      }),
      headers: {
        Authorization: `Bearer ${env.AI_GATEWAY_API_KEY}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as {
      choices?: { message?: { content?: unknown } }[];
    };
    const content = body.choices?.[0]?.message?.content;

    return typeof content === "string" ? parseReply(content, allowed) : null;
  } catch {
    return null;
  }
};
