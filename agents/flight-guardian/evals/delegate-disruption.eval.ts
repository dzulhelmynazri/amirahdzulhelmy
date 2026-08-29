import { defineEval } from "eve/evals";

export default defineEval({
  description: "An incident lookup hops to disruption-guard.",
  tags: ["live"],
  async test(t) {
    await t.send(
      "Check delays or cancellations on my booked trip. orderNo ATL1234567890, PNR ABCDEF, SQ321 SIN to LHR on 2026-12-15. Hand those IDs to the disruption specialist. Look up incidents only — do not rebook, refund, or book a new trip."
    );
    t.succeeded();
    t.calledSubagent("disruption-guard");
    t.notCalledTool("rebook-agent");
    t.notCalledTool("booking-agent");
  },
  timeoutMs: 240_000,
});
