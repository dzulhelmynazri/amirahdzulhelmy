import { defineEval } from "eve/evals";

export default defineEval({
  description:
    "A destination alert that may affect a flight hops to disruption-guard.",
  tags: ["live"],
  async test(t) {
    await t.send(
      "There's a major typhoon warning for the Kansai region in Japan. My flight SQ123 arrives at KIX on 2026-12-15, orderNo ATL1234567890. Check if this affects my flight by calling disruption-guard with those details. Do not rebook or book anything yourself."
    );
    t.succeeded();
    t.calledSubagent("disruption-guard");
    t.notCalledTool("create-order");
    t.notCalledTool("booking-agent");
    t.notCalledTool("rebook-agent");
  },
  timeoutMs: 240_000,
});
