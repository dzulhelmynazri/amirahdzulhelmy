import { defineEval } from "eve/evals";

export default defineEval({
  description: "A flexible-date request uses smart-search and does not book.",
  tags: ["live"],
  async test(t) {
    await t.send(
      "I can fly one-way SIN to LHR any day in the last week of August 2026 for 1 adult. I confirm those details. Use smart-search, not flight-search. List options only — do not verify, create an order, or take payment."
    );
    t.succeeded();
    t.calledTool("smart-search");
    t.notCalledTool("create-order");
    t.notCalledTool("payment-and-ticketing");
  },
  timeoutMs: 180_000,
});
