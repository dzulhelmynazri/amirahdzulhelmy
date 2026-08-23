import { defineEval } from "eve/evals";

export default defineEval({
  description: "A ground-transfer request hops to journey-concierge.",
  tags: ["live"],
  async test(t) {
    await t.send(
      "I land at London Heathrow Terminal 5 at 16:00 and need to get to Paddington. Hand this to the journey concierge. Ground transfer advice only — do not book or rebook a flight, and do not create calendar events."
    );
    t.succeeded();
    t.calledSubagent("journey-concierge");
    t.notCalledTool("booking-agent");
    t.notCalledTool("rebook-agent");
  },
  timeoutMs: 240_000,
});
