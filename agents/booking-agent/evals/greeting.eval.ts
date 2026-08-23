import { defineEval } from "eve/evals";

export default defineEval({
  description: "A greeting does not search or start a booking.",
  tags: ["fast"],
  async test(t) {
    await t.send(
      "Just greet me and say what you can help with. Do not search, create an order, or call other agents."
    );
    t.succeeded();
    t.notCalledTool("flight-search");
    t.notCalledTool("smart-search");
    t.notCalledTool("create-order");
    t.notCalledTool("confirm-order");
    t.notCalledTool("payment-and-ticketing");
  },
});
