import { defineEval } from "eve/evals";

export default defineEval({
  description: "An order status check uses query-order and does not rebook.",
  tags: ["live"],
  async test(t) {
    await t.send(
      "Look up live status for orderNo ATL1234567890 using query-order. Summarize what you find. Pending ticketing is not a failure. Do not rebook, refund, or call other agents."
    );
    t.succeeded();
    t.calledTool("query-order", {
      input: { orderNo: "ATL1234567890" },
      status: "failed",
    });
    t.notCalledTool("rebook-agent");
    t.notCalledTool("create-order");
    t.notCalledTool("refunds");
  },
  timeoutMs: 180_000,
});
