import { defineEval } from "eve/evals";

export default defineEval({
  description: "A PNR lookup uses extract-pnr and does not book.",
  tags: ["live"],
  async test(t) {
    await t.send(
      "Extract booking details for PNR ABCDEF using extract-pnr. Pass that PNR exactly. Summarize what you find. Do not book, rebook, or create calendar events."
    );
    t.succeeded();
    t.calledTool("extract-pnr", { input: { pnr: "ABCDEF" } });
    t.messageIncludes("ABCDEF");
    t.notCalledTool("booking-agent");
    t.notCalledTool("create-order");
  },
  timeoutMs: 180_000,
});
