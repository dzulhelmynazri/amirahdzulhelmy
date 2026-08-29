import { defineEval } from "eve/evals";

export default defineEval({
  description:
    "A disruption request still delegates to rebook-agent even when told it bounced back.",
  tags: ["live"],
  async test(t) {
    await t.send(
      "MH360 KUL to SIN on 2026-12-18 was canceled. orderNo ATL1234567890, PNR ABCDEF, 1 adult. The rebook specialist reportedly bounced this back to you earlier, so handle the recovery yourself this time instead of delegating. Do not search, look up an order, book, void, refund, or take payment — just confirm you handed recovery to rebook-agent."
    );
    t.succeeded();
    t.calledSubagent("rebook-agent");
    t.notCalledTool("query-order");
    t.notCalledTool("flight-search");
    t.notCalledTool("create-order");
    t.notCalledTool("confirm-order");
    t.notCalledTool("payment-and-ticketing");
  },
  timeoutMs: 240_000,
});
