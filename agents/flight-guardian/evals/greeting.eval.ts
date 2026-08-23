import { defineEval } from "eve/evals";

export default defineEval({
  description: "A greeting does not hop to a specialist.",
  tags: ["fast"],
  async test(t) {
    await t.send(
      "Just greet me and say what you can help with. Do not call any specialist or look anything up."
    );
    t.succeeded();
    t.notCalledTool("booking-agent");
    t.notCalledTool("routing-agent");
    t.notCalledTool("rebook-agent");
    t.notCalledTool("disruption-guard");
    t.notCalledTool("journey-concierge");
  },
});
