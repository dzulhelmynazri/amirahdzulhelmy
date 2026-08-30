import { defineEval } from "eve/evals";

/**
 * booking-agent is no longer a subagent here, so the handoff is what this
 * agent can actually produce: the chosen routingIdentifier, and the name of
 * who takes it next.
 *
 * The peer wiring was removed because it could not work — none of these four
 * agents is mounted as an endpoint, so every hop between them answered HTTP
 * 404. routing-agent stays read-only either way, which is the property worth
 * gating.
 */
export default defineEval({
  description:
    "After the traveler picks a ranked option, routing-agent hands back the identifier and names booking-agent.",
  tags: ["live"],
  async test(t) {
    const ranked = await t.send(
      "Search one-way fares from SIN to LHR on 2026-12-15 for 1 adult. I confirm those details. Use flight-search, not route-export. Rank a short cheap list. Do not book yet."
    );
    ranked.calledTool("flight-search");
    ranked.notCalledTool("booking-agent");

    await t.send(
      "I pick the cheapest option. This is a new booking, not a rebooking. Give me the exact routingIdentifier from that option for SIN to LHR on 2026-12-15, 1 adult passenger DOE/JOHN, and say who takes it from here. Do not create an order or take payment."
    );
    t.succeeded();
    t.messageIncludes("booking-agent");
    t.notCalledTool("rebook-agent");
    t.notCalledTool("create-order");
    t.notCalledTool("route-export");
  },
  timeoutMs: 300_000,
});
