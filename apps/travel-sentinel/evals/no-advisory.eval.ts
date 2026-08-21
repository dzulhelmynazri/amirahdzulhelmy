import { defineEval } from "eve/evals";

export default defineEval({
  description:
    "A clean destination has no advisories and the agent says so clearly.",
  tags: ["live"],
  async test(t) {
    await t.send(
      "Are there any travel advisories for Zurich, Switzerland in September 2026? Search the web. If nothing significant is found, clearly state that there are no current advisories. Do not fabricate alerts."
    );
    t.succeeded();
    t.notCalledTool("create-order");
    t.notCalledTool("booking-agent");
    t.notCalledTool("disruption-guard");
  },
  timeoutMs: 180_000,
});
