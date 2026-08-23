import { defineEval } from "eve/evals";

export default defineEval({
  description: "refunds parks for approval and does not void or pay.",
  tags: ["live"],
  async test(t) {
    await t.send(
      "Refund orderNo ATL1234567890 in full. I confirm that order and the full-order scope. Call refunds now. Do not void, pay, or create a new order."
    );
    t.parked();
    t.calledTool("refunds", { status: "pending" });
    t.requireInputRequest({ toolName: "refunds" });
    t.notCalledTool("void-order");
    t.notCalledTool("payment-and-ticketing");
    t.notCalledTool("create-order");
  },
  timeoutMs: 120_000,
});
