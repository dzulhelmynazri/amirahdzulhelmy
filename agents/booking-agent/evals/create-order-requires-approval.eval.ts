import { defineEval } from "eve/evals";

export default defineEval({
  description: "create-order parks for approval and does not pay.",
  tags: ["live"],
  async test(t) {
    await t.send(
      "The offer is already verified. sessionId SESS-EVAL-001, routingIdentifier RID-EVAL-001. Passenger DOE/JOHN, gender M, birthday 1990-01-01, passengerType adult. Contact DOE/JOHN, email eval@example.com, mobile 001-5550100. Call create-order now. Do not search, verify, or pay."
    );
    t.parked();
    t.calledTool("create-order", { status: "pending" });
    t.requireInputRequest({ toolName: "create-order" });
    t.notCalledTool("payment-and-ticketing");
  },
  timeoutMs: 120_000,
});
