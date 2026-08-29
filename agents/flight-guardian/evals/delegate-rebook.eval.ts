import { defineEval } from "eve/evals";

export default defineEval({
  description: "A disrupted-trip recovery request hops to rebook-agent.",
  tags: ["live"],
  async test(t) {
    await t.send(
      "My SQ321 SIN to LHR on 2026-12-15 was canceled. Hand this to the rebook specialist. Search replacement one-way SIN to LHR that day for 1 adult. List options only — do not look up an order, book, void, refund, or take payment."
    );
    t.succeeded();
    t.calledSubagent("rebook-agent");
    t.notCalledTool("booking-agent");
    t.notCalledTool("create-order");
    t.notCalledTool("void-order");
    t.notCalledTool("refunds");
  },
  timeoutMs: 240_000,
});
