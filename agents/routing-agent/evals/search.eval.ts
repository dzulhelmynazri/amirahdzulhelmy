import { defineEval } from "eve/evals";

export default defineEval({
  description:
    "An exact-date ranking uses flight-search, not full route-export.",
  tags: ["live"],
  async test(t) {
    await t.send(
      "Search one-way fares from SIN to LHR on 2026-12-15 for 1 adult. I confirm those details. Use flight-search, not route-export. Rank a short cheap list. Do not book."
    );
    t.succeeded();
    t.calledTool("flight-search");
    t.notCalledTool("route-export");
    t.notCalledTool("create-order");
    t.notCalledTool("booking-agent");
  },
  timeoutMs: 180_000,
});
