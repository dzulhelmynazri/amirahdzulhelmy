import { defineEval } from "eve/evals";

export default defineEval({
  description: "A destination intelligence request hops to travel-sentinel.",
  tags: ["live"],
  async test(t) {
    await t.send(
      "What should I know about traveling to Tokyo right now? Any safety alerts, weather warnings, or transit disruptions? Hand this to the travel sentinel specialist. Intelligence only — do not book or rebook a flight."
    );
    t.succeeded();
    t.calledSubagent("travel-sentinel");
    t.notCalledTool("booking-agent");
    t.notCalledTool("rebook-agent");
    t.notCalledTool("create-order");
  },
  timeoutMs: 240_000,
});
