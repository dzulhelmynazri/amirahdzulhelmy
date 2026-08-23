import { defineEval } from "eve/evals";

export default defineEval({
  description: "A greeting does not search or export routes.",
  tags: ["fast"],
  async test(t) {
    await t.send(
      "Just greet me and say what you can help with. Do not search, export routes, or call other agents."
    );
    t.succeeded();
    t.notCalledTool("flight-search");
    t.notCalledTool("smart-search");
    t.notCalledTool("price-compare-search");
    t.notCalledTool("route-export");
  },
});
