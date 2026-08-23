import { defineEval } from "eve/evals";

export default defineEval({
  description: "A route-ranking request hops to routing-agent.",
  tags: ["live"],
  async test(t) {
    await t.send(
      "Rank cheap one-way options from SIN to LHR on 2026-08-25 for 1 adult. Hand this to the routing specialist. Search fares only — do not export the full route catalog and do not book."
    );
    t.succeeded();
    t.calledSubagent("routing-agent");
    t.notCalledTool("create-order");
    t.notCalledTool("route-export");
  },
  timeoutMs: 240_000,
});
