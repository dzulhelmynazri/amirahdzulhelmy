import { defineEval } from "eve/evals";

export default defineEval({
  description: "A ground-transfer question does not hop to a flight booker.",
  tags: ["fast"],
  async test(t) {
    await t.send(
      "I land at London Heathrow Terminal 5 at 16:00 and need to get to Paddington. Advise on ground transfer only. Do not book or rebook any flight, and do not create calendar events."
    );
    t.succeeded();
    t.notCalledTool("booking-agent");
    t.notCalledTool("rebook-agent");
    t.notCalledTool("create-order");
  },
});
