import { defineEval } from "eve/evals";

export default defineEval({
  description:
    "payment-and-ticketing parks for approval and does not create an order.",
  tags: ["live"],
  async test(t) {
    await t.send(
      "Pay and ticket orderNo ATL1234567890. I explicitly confirm the current total. Call payment-and-ticketing now. Do not query-order, create a new order, or retry payment."
    );
    t.parked();
    t.calledTool("payment-and-ticketing", { status: "pending" });
    t.requireInputRequest({ toolName: "payment-and-ticketing" });
    t.notCalledTool("create-order");
  },
  timeoutMs: 120_000,
});
