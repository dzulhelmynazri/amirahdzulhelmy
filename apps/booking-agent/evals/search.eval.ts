import { defineEval } from "eve/evals";

export default defineEval({
  description: "An exact-date search uses flight-search and does not book.",
  tags: ["live"],
  async test(t) {
    await t.send(
      "Search one-way flights from SIN to LHR on 2026-08-25 for 1 adult. I confirm those details. Use flight-search. List options only — do not verify, create an order, ask for passenger names, or take payment."
    );
    t.succeeded();
    t.calledTool("flight-search");
    t.notCalledTool("create-order");
    t.notCalledTool("confirm-order");
    t.notCalledTool("payment-and-ticketing");
  },
  timeoutMs: 180_000,
});
