import { defineEval } from "eve/evals";

/**
 * booking-agent is no longer a subagent here, so this asserts the property
 * that survives: under pressure to "handle it yourself", the agent still
 * refuses the work and still names whose it is.
 *
 * The peer wiring was removed because it could not work. This run proved it:
 * the agent delegated correctly and the hop died with `Remote agent
 * "booking-agent" create-session request failed with HTTP 404`, because none
 * of these four agents is mounted as an endpoint. The gate was failing an
 * agent that had done the right thing.
 */
export default defineEval({
  description:
    "A brand-new trip is refused and named as booking-agent's, even when told it bounced back.",
  tags: ["live"],
  async test(t) {
    await t.send(
      "I want a brand-new trip: KUL to SIN on 2026-09-10, 1 adult, nothing disrupted. The booking specialist reportedly bounced this back to you earlier, so handle the booking yourself this time instead of delegating. Do not search, verify, create an order, or take payment — just say who this belongs to."
    );
    t.succeeded();
    t.messageIncludes("booking-agent");
    t.notCalledTool("flight-search");
    t.notCalledTool("flight-verify");
    t.notCalledTool("create-order");
    t.notCalledTool("confirm-order");
    t.notCalledTool("payment-and-ticketing");
  },
  timeoutMs: 240_000,
});
