import { defineEval } from "eve/evals";

export default defineEval({
  description:
    "Memory recall prevents re-reporting an already-surfaced destination alert.",
  tags: ["live"],
  async test(t) {
    const first = await t.send(
      "What are the current travel advisories for Istanbul, Turkey? Search and summarize. Save what you find to memory."
    );
    first.calledTool("save-memory");

    await t.send(
      "Check again — are there any NEW travel advisories for Istanbul that I haven't already been told about? Check your memory first before searching."
    );
    t.succeeded();
    t.calledTool("recall-memory");
    t.notCalledTool("create-order");
    t.notCalledTool("booking-agent");
  },
  timeoutMs: 240_000,
});
