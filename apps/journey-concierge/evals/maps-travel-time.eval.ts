import { defineEval } from "eve/evals";

const ORIGIN = "LHR Terminal 5";
const DESTINATION = "Paddington";

export default defineEval({
  description:
    "With Maps connected, Journey Concierge estimates ground travel time and does not book.",
  tags: ["live"],
  async test(t) {
    if (!process.env.COMPOSIO_EVAL_USER_ID) {
      t.skip(
        "Set COMPOSIO_EVAL_USER_ID to the Better Auth user id with Google Maps connected."
      );
    }

    await t.send(
      `Estimate taxi travel time from ${ORIGIN} to ${DESTINATION} using Google Maps. Report the duration from Maps. Do not guess, create calendar events, or book a flight.`
    );

    t.succeeded();
    t.calledTool("COMPOSIO_MULTI_EXECUTE_TOOL", {
      input: (input) => {
        const payload = JSON.stringify(input).toUpperCase();
        return (
          payload.includes("GOOGLE") &&
          payload.includes("MAP") &&
          payload.includes("PADDINGTON")
        );
      },
    });
    t.notCalledTool("booking-agent");
    t.notCalledTool("rebook-agent");
    t.notCalledTool("create-order");
  },
  timeoutMs: 180_000,
});
