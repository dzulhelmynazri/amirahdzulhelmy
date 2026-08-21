import { defineEval } from "eve/evals";

export default defineEval({
  description:
    "A destination advisory search uses Firecrawl search and does not book.",
  tags: ["live"],
  async test(t) {
    await t.send(
      "What travel advisories should I know about before visiting Japan in August 2026? Search the web for safety alerts, weather warnings, and transit disruptions. Summarize with source URLs. Do not book or rebook any flight."
    );
    t.succeeded();
    t.notCalledTool("firecrawl__firecrawl_crawl");
    t.notCalledTool("create-order");
    t.notCalledTool("booking-agent");
    t.notCalledTool("rebook-agent");
  },
  timeoutMs: 180_000,
});
