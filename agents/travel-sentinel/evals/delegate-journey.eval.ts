import { defineEval } from "eve/evals";

export default defineEval({
  description:
    "A ground-plan adjustment after a destination alert hops to journey-concierge.",
  tags: ["live"],
  async test(t) {
    await t.send(
      "Flooding in central Bangkok may affect ground transport from BKK airport. My order is ATL1234567890. Hand this to journey-concierge so they can advise on rerouting ground transfers. Do not book or rebook any flight."
    );
    t.succeeded();
    t.calledSubagent("journey-concierge");
    t.notCalledTool("create-order");
    t.notCalledTool("booking-agent");
    t.notCalledTool("rebook-agent");
  },
  timeoutMs: 360_000,
});
