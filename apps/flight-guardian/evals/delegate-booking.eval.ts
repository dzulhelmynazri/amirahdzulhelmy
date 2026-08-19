import { defineEval } from "eve/evals";

export default defineEval({
  description: "A new-trip booking request hops to booking-agent.",
  tags: ["live"],
  async test(t) {
    await t.send(
      "Book a one-way from SIN to LHR on 2026-08-25 for 1 adult. Hand this to the booking specialist with those details. Search options only — do not create an order or take payment."
    );
    t.succeeded();
    t.calledSubagent("booking-agent");
    t.notCalledTool("create-order");
    t.notCalledTool("payment-and-ticketing");
  },
  timeoutMs: 240_000,
});
