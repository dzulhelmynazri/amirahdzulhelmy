import { env } from "@atlas/env/server";

/**
 * Three things the traveller might want next, generated after a turn.
 *
 * Flight Guardian is asked to offer these itself via `ask_question`, and it
 * does not do it. Measured on both `zai/glm-5.3-flash` and
 * `alibaba/qwen3.7-flash`: asked "What is there in Tokyo?" it ended in prose —
 * "are you looking to plan activities, or just curious?" — while being able to
 * quote the rule against doing so word for word. An instruction competing with
 * a dozen others is advice.
 *
 * So this is a separate call with exactly one job. Nothing competes with it,
 * and its output is parsed rather than trusted.
 *
 * The pills it produces go into the composer and are sent as ordinary
 * messages, unlike `ask_question` options, which answer a live request. When
 * the agent does offer its own, those win — they are better, because they
 * resolve the turn instead of starting another.
 */

const GATEWAY = "https://ai-gateway.vercel.sh/v1/chat/completions";

/**
 * Deliberately not the agent model, and latency is the reason.
 *
 * The pill row has an 8s timeout, and the agents' qwen measured 7.7-10.4s on
 * this exact prompt even with reasoning_effort "none" — pills would simply
 * never appear half the time. ling answers in ~2.1s.
 *
 * Not free, despite an earlier comment here claiming it was: ling-3.0-flash
 * is listed at $0.06/M in. A call this size costs about $0.00003, which is
 * the whole of the price of working pills.
 */
const MODEL = "inclusionai/ling-3.0-flash";

/**
 * Reasoning off, and this is the whole difference between working and not.
 *
 * Left on, the same call took 11.7s and the first version of this timed out
 * every time. Off, 2.1s. There is nothing here worth thinking about: the
 * answer is three lines paraphrasing what was just said.
 */
const REASONING_EFFORT = "none";

/** Room for the array, with slack for a model that pads. */
const MAX_TOKENS = 400;

/**
 * Suggestions are decoration and must never hold up a reply. Four times the
 * measured 2.1s, so a slow day degrades to no pills rather than to a wait.
 */
const TIMEOUT_MS = 8000;

const MAX_SUGGESTIONS = 3;
const MAX_LABEL_LENGTH = 48;
/** Enough of the reply to know what it was about, not the whole fare table. */
const CONTEXT_LIMIT = 1200;

/**
 * The capability list is exhaustive on purpose.
 *
 * Given only "a flight booking assistant" it suggested "Book a hotel near
 * Shibuya Crossing". Atlas does not book hotels, so that is a tap leading
 * nowhere — worse than no tap, because it teaches the traveller the pills lie.
 */
const SYSTEM = `You write follow-up suggestions for Atlas, a flight assistant.

Given the last exchange, return the three things this traveller is most likely to want next.

Atlas can ONLY: search flights, compare fares across dates, book and pay for a flight, add baggage or seats, check an existing order, refund or void a ticket, rebook a disrupted trip, report destination alerts, and write a trip itinerary document.

Atlas cannot book hotels, cars, tours, restaurants or activities. Never suggest one.

Rules:
- Each suggestion is one of the things Atlas can do, applied to what was just said.
- Phrase it as the traveller would type it, first person, under 48 characters.
- Specific. "Book the 07:20 AirAsia" is a suggestion; "Tell me more" is a wasted tap.
- No greetings, no questions back, no explanations.

Return only a JSON array of three strings. Nothing else.`;

const parseLabels = (raw: string): string[] => {
  // The model is asked for bare JSON and sometimes fences it anyway.
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");

  if (start === -1 || end <= start) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw.slice(start, end + 1));

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0 && entry.length <= MAX_LABEL_LENGTH)
      .slice(0, MAX_SUGGESTIONS);
  } catch {
    return [];
  }
};

/**
 * Returns an empty list on any failure, including a timeout or a reply that
 * is not the JSON it was asked for. There is no error state to show: pills
 * that do not appear are simply pills the traveller never knew about, which
 * is a far smaller cost than an error banner under every answer.
 */
export const followUpSuggestions = async (input: {
  assistantMessage: string;
  userMessage: string;
}): Promise<string[]> => {
  const assistant = input.assistantMessage.slice(0, CONTEXT_LIMIT).trim();
  const user = input.userMessage.slice(0, CONTEXT_LIMIT).trim();

  if (!(assistant && user)) {
    return [];
  }

  try {
    const response = await fetch(GATEWAY, {
      body: JSON.stringify({
        max_tokens: MAX_TOKENS,
        messages: [
          { content: SYSTEM, role: "system" },
          {
            content: `Traveller asked:\n${user}\n\nAssistant replied:\n${assistant}`,
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
      return [];
    }

    const body = (await response.json()) as {
      choices?: { message?: { content?: unknown } }[];
    };
    const content = body.choices?.[0]?.message?.content;

    return typeof content === "string" ? parseLabels(content) : [];
  } catch {
    return [];
  }
};
