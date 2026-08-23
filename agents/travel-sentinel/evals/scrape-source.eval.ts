import { defineEval } from "eve/evals";

export default defineEval({
  description:
    "A scrape request deepens a search result and does not trigger flight actions.",
  tags: ["live"],
  async test(t) {
    const first = await t.send(
      "Search for current travel advisories for Bangkok, Thailand. Use firecrawl search. If you find a government advisory page, scrape it for full details. Summarize with sources. Do not book anything."
    );
    first.calledTool("firecrawl__firecrawl_search");

    await t.send(
      "Thanks. Now scrape the US State Department travel advisory page at https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories.html for Thailand specifically. Summarize only."
    );
    t.succeeded();
    t.calledTool("firecrawl__firecrawl_scrape");
    t.notCalledTool("create-order");
    t.notCalledTool("booking-agent");
    t.notCalledTool("rebook-agent");
    t.notCalledTool("void-order");
  },
  timeoutMs: 240_000,
});
