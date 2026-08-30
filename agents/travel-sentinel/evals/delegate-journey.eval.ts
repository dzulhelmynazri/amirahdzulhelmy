import { defineEval } from "eve/evals";

/**
 * The hop is to flight-guardian, not to journey-concierge directly.
 *
 * journey-concierge stopped being mounted here when the specialists moved
 * inside flight-guardian as local subagents — Vercel Hobby caps a deployment
 * at 12 functions. Asserting `calledSubagent("journey-concierge")` asks for a
 * subagent this agent no longer has, so it can never pass; the conductor is
 * the route.
 *
 * The prompt names flight-guardian for the same reason. Telling the agent to
 * hand the work to journey-concierge named a specialist it cannot reach, and
 * it answered by delegating to nothing at all.
 */
export default defineEval({
  description:
    "A ground-plan adjustment after a destination alert hops to flight-guardian.",
  tags: ["live"],
  async test(t) {
    await t.send(
      "Flooding in central Bangkok may affect ground transport from BKK airport. My order is ATL1234567890. Hand this to flight-guardian so its concierge specialist can advise on rerouting ground transfers. Do not book or rebook any flight."
    );
    t.succeeded();
    t.calledSubagent("flight-guardian");
    t.notCalledTool("create-order");
    t.notCalledTool("booking-agent");
    t.notCalledTool("rebook-agent");
  },
  timeoutMs: 360_000,
});
