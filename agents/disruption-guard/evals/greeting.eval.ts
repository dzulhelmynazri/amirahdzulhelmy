import { defineEval } from "eve/evals";

export default defineEval({
  description: "A greeting does not look up incidents or hop to rebook-agent.",
  tags: ["fast"],
  async test(t) {
    await t.send(
      "Just greet me and say what you can help with. Do not look up incidents, orders, or call other agents."
    );
    t.succeeded();
    t.notCalledTool("webhook-incidents");
    t.notCalledTool("query-order");
    t.notCalledTool("order-list");
    t.notCalledTool("rebook-agent");
  },
});
