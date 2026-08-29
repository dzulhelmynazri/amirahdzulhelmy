import { defineEval } from "eve/evals";

export default defineEval({
  description:
    "A fare-comparison request uses price-compare-search and does not book.",
  tags: ["live"],
  async test(t) {
    await t.send(
      "Compare one-way fares from SIN to LHR around 2026-12-15 for 1 adult. I confirm those details. Use price-compare-search, not route-export. Rank a short list. Do not book."
    );
    t.succeeded();
    t.calledTool("price-compare-search");
    t.notCalledTool("route-export");
    t.notCalledTool("create-order");
    t.notCalledTool("booking-agent");
  },
  timeoutMs: 180_000,
});
