import { defineEval } from "eve/evals";

export default defineEval({
  description:
    "Without Maps connected, the concierge does not guess travel times or book flights.",
  tags: ["fast"],
  async test(t) {
    await t.send(
      "Estimate taxi time from LHR Terminal 5 to Paddington using Google Maps. If Maps is not connected, tell me to connect it on the Integrations page. Do not guess minutes, create calendar events, or book a flight."
    );
    t.succeeded();
    t.notCalledTool("booking-agent");
    t.notCalledTool("rebook-agent");
    t.notCalledTool("create-order");
  },
});
