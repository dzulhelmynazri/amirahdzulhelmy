import { defineEval } from "eve/evals";

export default defineEval({
  description: "A greeting does not look up orders or book flights.",
  tags: ["fast"],
  async test(t) {
    await t.send(
      "Just greet me and say what you can help with. Do not look up orders, touch calendar or Gmail, or call other agents."
    );
    t.succeeded();
    t.notCalledTool("query-order");
    t.notCalledTool("extract-pnr");
    t.notCalledTool("email-query");
    t.notCalledTool("booking-agent");
    t.notCalledTool("rebook-agent");
  },
});
