import { defineEval } from "eve/evals";

export default defineEval({
  description: "void-order parks for approval and does not refund or pay.",
  tags: ["live"],
  async test(t) {
    await t.send(
      "Void orderNo ATL1234567890. I confirm that order number and that it is before ticketing. Call void-order now. Do not refund, pay, or create a new order."
    );
    t.parked();
    t.calledTool("void-order", { status: "pending" });
    t.requireInputRequest({ toolName: "void-order" });
    t.notCalledTool("refunds");
    t.notCalledTool("payment-and-ticketing");
    t.notCalledTool("create-order");
  },
  timeoutMs: 120_000,
});
