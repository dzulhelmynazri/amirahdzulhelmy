import { defineEval } from "eve/evals";

export default defineEval({
  description: "An incident check uses webhook-incidents and does not rebook.",
  tags: ["live"],
  async test(t) {
    await t.send(
      "Check webhook incidents from the last 60 minutes. Summarize what you find. If none, say so. Do not rebook, refund, or call other agents."
    );
    t.succeeded();
    t.calledTool("webhook-incidents");
    t.notCalledTool("rebook-agent");
    t.notCalledTool("create-order");
    t.notCalledTool("refunds");
  },
  timeoutMs: 180_000,
});
