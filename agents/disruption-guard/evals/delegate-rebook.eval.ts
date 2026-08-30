import { defineEval } from "eve/evals";

/**
 * The hop is to flight-guardian, not to rebook-agent directly.
 *
 * rebook-agent stopped being mounted here when the specialists moved inside
 * flight-guardian as local subagents — Vercel Hobby caps a deployment at 12
 * functions. Asserting `calledSubagent("rebook-agent")` asks for a subagent
 * this agent no longer has, so it can never pass; the conductor is the route.
 */
export default defineEval({
  description:
    "A replacement request after a cancellation hops to flight-guardian.",
  tags: ["live"],
  async test(t) {
    await t.send(
      "SQ321 SIN to LHR on 2026-12-15 was canceled. orderNo ATL1234567890, PNR ABCDEF, 1 adult. I want a replacement flight. Hand this to the rebook specialist with those details. Search options only — do not book, void, or refund. Do not call routing-agent or booking-agent."
    );
    t.succeeded();
    t.calledSubagent("flight-guardian");
    t.notCalledTool("booking-agent");
    t.notCalledTool("routing-agent");
    t.notCalledTool("create-order");
    t.notCalledTool("refunds");
  },
  timeoutMs: 240_000,
});
