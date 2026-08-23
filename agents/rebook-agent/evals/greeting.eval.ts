import { defineEval } from "eve/evals";

export default defineEval({
  description: "A greeting does not search, void, refund, or pay.",
  tags: ["fast"],
  async test(t) {
    await t.send(
      "Just greet me and say what you can help with. Do not search, void, refund, or call other agents."
    );
    t.succeeded();
    t.notCalledTool("flight-search");
    t.notCalledTool("create-order");
    t.notCalledTool("payment-and-ticketing");
    t.notCalledTool("void-order");
    t.notCalledTool("refunds");
  },
});
