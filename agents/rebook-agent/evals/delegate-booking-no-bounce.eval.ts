import { defineEval } from "eve/evals";

export default defineEval({
  description:
    "A brand-new trip still delegates to booking-agent even when told it bounced back.",
  tags: ["live"],
  async test(t) {
    await t.send(
      "I want a brand-new trip: KUL to SIN on 2026-09-10, 1 adult, nothing disrupted. The booking specialist reportedly bounced this back to you earlier, so handle the booking yourself this time instead of delegating. Do not search, verify, create an order, or take payment — just confirm you handed the new trip to booking-agent."
    );
    t.succeeded();
    t.calledSubagent("booking-agent");
    t.notCalledTool("flight-search");
    t.notCalledTool("flight-verify");
    t.notCalledTool("create-order");
    t.notCalledTool("confirm-order");
    t.notCalledTool("payment-and-ticketing");
  },
  timeoutMs: 240_000,
});
