import { defineEval } from "eve/evals";

export default defineEval({
  description:
    "After the traveler picks a ranked option, routing-agent hops to booking-agent.",
  tags: ["live"],
  async test(t) {
    const ranked = await t.send(
      "Search one-way fares from SIN to LHR on 2026-08-25 for 1 adult. I confirm those details. Use flight-search, not route-export. Rank a short cheap list. Do not book yet."
    );
    ranked.calledTool("flight-search");
    ranked.notCalledTool("booking-agent");

    await t.send(
      "I pick the cheapest option. This is a new booking, not a rebooking. Hand the exact routingIdentifier from that option to booking-agent with SIN to LHR on 2026-08-25 for 1 adult passenger DOE/JOHN. Tell booking-agent to search or verify only — do not create an order or take payment. Do not call rebook-agent."
    );
    t.succeeded();
    t.calledSubagent("booking-agent");
    t.notCalledTool("rebook-agent");
    t.notCalledTool("create-order");
    t.notCalledTool("route-export");
  },
  timeoutMs: 300_000,
});
