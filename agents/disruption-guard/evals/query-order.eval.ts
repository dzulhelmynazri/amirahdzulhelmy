import { defineEval } from "eve/evals";

export default defineEval({
  description: "An order status check uses query-order and does not rebook.",
  tags: ["live"],
  async test(t) {
    await t.send(
      "Look up live status for orderNo ATL1234567890 using query-order. Summarize what you find. Pending ticketing is not a failure. Do not rebook, refund, or call other agents."
    );
    t.succeeded();
    // Asserted on the input only. Pinning `status: "failed"` made this gate
    // depend on the Atlas sandbox rejecting a made-up order number, so a
    // sandbox that answers it turns a correct run red. What is being tested is
    // that the agent reaches for query-order with the order it was given —
    // whether the upstream call succeeds is not this agent's behaviour.
    t.calledTool("query-order", { input: { orderNo: "ATL1234567890" } });
    t.notCalledTool("rebook-agent");
    t.notCalledTool("create-order");
    t.notCalledTool("refunds");
  },
  timeoutMs: 180_000,
});
