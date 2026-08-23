import { defineEval } from "eve/evals";

export default defineEval({
  description:
    "A replacement search lists options without booking or canceling.",
  tags: ["live"],
  async test(t) {
    await t.send(
      "Search replacement one-way SIN to LHR flights on 2026-08-25 for 1 adult. Do not look up an existing order. Use flight-search. List options only — do not verify, create an order, void, refund, or take payment."
    );
    t.succeeded();
    t.calledTool("flight-search");
    t.notCalledTool("create-order");
    t.notCalledTool("confirm-order");
    t.notCalledTool("payment-and-ticketing");
    t.notCalledTool("void-order");
    t.notCalledTool("refunds");
  },
  timeoutMs: 180_000,
});
