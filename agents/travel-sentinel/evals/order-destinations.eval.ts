import { defineEval } from "eve/evals";

export default defineEval({
  description: "An order lookup uses query-order to identify destinations.",
  tags: ["live"],
  async test(t) {
    await t.send(
      "Look up order ATL1234567890 using query-order to find out where the traveler is going. A failed or pending lookup is expected — do not ask the user for clarification. Summarize what you find and then search for travel advisories for any destination you can identify. Do not book or rebook."
    );
    t.succeeded();
    t.calledTool("query-order", {
      input: { orderNo: "ATL1234567890" },
    });
    t.notCalledTool("booking-agent");
    t.notCalledTool("rebook-agent");
    t.notCalledTool("create-order");
    t.notCalledTool("ask_question");
  },
  timeoutMs: 180_000,
});
