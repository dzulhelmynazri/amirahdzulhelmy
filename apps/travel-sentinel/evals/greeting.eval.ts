import { defineEval } from "eve/evals";

export default defineEval({
  description: "A greeting does not search the web or look up orders.",
  tags: ["fast"],
  async test(t) {
    await t.send(
      "Just greet me and say what you can help with. Do not search the web, scrape pages, look up orders, or call other agents."
    );
    t.succeeded();
    t.notCalledTool("firecrawl__firecrawl_search");
    t.notCalledTool("firecrawl__firecrawl_scrape");
    t.notCalledTool("firecrawl__firecrawl_crawl");
    t.notCalledTool("query-order");
    t.notCalledTool("order-list");
    t.notCalledTool("disruption-guard");
  },
});
