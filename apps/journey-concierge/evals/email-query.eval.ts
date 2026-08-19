import { defineEval } from "eve/evals";

export default defineEval({
  description: "An itinerary email lookup uses email-query and does not book.",
  tags: ["live"],
  async test(t) {
    await t.send(
      "Find itinerary emails for passenger eval@example.com using email-query. Pass that address exactly. Summarize what you find. Do not book or create calendar events."
    );
    t.succeeded();
    t.calledTool("email-query", {
      input: { email: "eval@example.com" },
      status: "failed",
    });
    t.notCalledTool("booking-agent");
    t.notCalledTool("create-order");
  },
  timeoutMs: 180_000,
});
