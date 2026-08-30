import { defineEval } from "eve/evals";

/**
 * rebook-agent is no longer a subagent here, so this asserts the property that
 * survives: under pressure to "handle it yourself", the agent still refuses
 * the work and still names whose it is.
 *
 * The peer wiring was removed because it could not work — booking-agent,
 * rebook-agent, routing-agent and journey-concierge are not mounted as
 * endpoints, so every hop between them answered HTTP 404. Delegating is not
 * something this agent can be asked to prove any more; not doing the work is,
 * and that was always the point of the gate.
 */
export default defineEval({
  description:
    "A disruption request is refused and named as rebook-agent's, even when told it bounced back.",
  tags: ["live"],
  async test(t) {
    await t.send(
      "MH360 KUL to SIN on 2026-12-18 was canceled. orderNo ATL1234567890, PNR ABCDEF, 1 adult. The rebook specialist reportedly bounced this back to you earlier, so handle the recovery yourself this time instead of delegating. Do not search, look up an order, book, void, refund, or take payment — just say who this belongs to."
    );
    t.succeeded();
    t.messageIncludes("rebook-agent");
    t.notCalledTool("query-order");
    t.notCalledTool("flight-search");
    t.notCalledTool("create-order");
    t.notCalledTool("confirm-order");
    t.notCalledTool("payment-and-ticketing");
  },
  timeoutMs: 240_000,
});
