import { defineEval } from "eve/evals";

/**
 * A real sandbox order, un-ticketed — voiding is only valid before ticketing.
 *
 * ATL1234567890 does not exist: the API answers it with every field null. This
 * gate passed against it only when the agent skipped the playbook's opening
 * `query-order`, which is the opposite of what it should reward — its sibling
 * refund gate failed the same fixture for exactly that reason.
 *
 * Nothing is voided by running this. `void-order` carries approval: always(),
 * so the call parks before it executes, and the assertions below stop at
 * pending — they never approve. Keep it that way: voiding is irreversible.
 */
export default defineEval({
  description: "void-order parks for approval and does not refund or pay.",
  tags: ["live"],
  async test(t) {
    await t.send(
      "Void orderNo TESTA20260829155621731. I confirm that order number and that it is before ticketing. Call void-order now. Do not refund, pay, or create a new order."
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
