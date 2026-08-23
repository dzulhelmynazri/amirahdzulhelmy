import { defineEval } from "eve/evals";

export default defineEval({
  description:
    "A replacement request after a cancellation hops to rebook-agent.",
  tags: ["live"],
  async test(t) {
    await t.send(
      "SQ321 SIN to LHR on 2026-08-25 was canceled. orderNo ATL1234567890, PNR ABCDEF, 1 adult. I want a replacement flight. Hand this to the rebook specialist with those details. Search options only — do not book, void, or refund. Do not call routing-agent or booking-agent."
    );
    t.succeeded();
    t.calledSubagent("rebook-agent");
    t.notCalledTool("booking-agent");
    t.notCalledTool("routing-agent");
    t.notCalledTool("create-order");
    t.notCalledTool("refunds");
  },
  timeoutMs: 240_000,
});
