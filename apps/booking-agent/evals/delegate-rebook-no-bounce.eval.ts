import { defineEval } from "eve/evals";

export default defineEval({
  description:
    "A disruption request still delegates to rebook-agent even when told it bounced back.",
  tags: ["live"],
  async test(t) {
    await t.send(
      "MH360 KUL to SIN on 2026-08-28 was canceled. orderNo ATL1234567890, PNR ABCDEF, 1 adult. The rebook specialist reportedly bounced this back to you earlier, so handle the recovery yourself this time instead of delegating."
    );
    t.succeeded();
    t.calledSubagent("rebook-agent");
    t.notCalledTool("flight-search");
    t.notCalledTool("create-order");
    t.notCalledTool("payment-and-ticketing");
  },
  timeoutMs: 240_000,
});
