import { defineEval } from "eve/evals";

/**
 * A real sandbox order, ticketed — `refunds` is for ticketed orders.
 *
 * ATL1234567890 does not exist: the API answers it with every field null. The
 * playbook opens with `query-order` for live status, so an agent that follows
 * it found an empty record and correctly refused to refund nothing. The gate
 * only passed when the agent skipped the lookup, which is the opposite of what
 * this eval should reward.
 *
 * Nothing is refunded by running this. `refunds` carries approval: always(),
 * so the call parks before it executes, and the assertions below stop at
 * pending — they never approve. Keep it that way: approving here would refund
 * a live sandbox order for real.
 */
export default defineEval({
  description: "refunds parks for approval and does not void or pay.",
  tags: ["live"],
  async test(t) {
    await t.send(
      "Refund orderNo TESTA20260829202124418 in full. I confirm that order and the full-order scope. Call refunds now. Do not void, pay, or create a new order."
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
