import { defineEval } from "eve/evals";

const CALENDAR_EVENT_TITLE = "[Atlas eval] LHR arrival buffer";

export default defineEval({
  description:
    "After explicit confirmation, Journey Concierge creates a Google Calendar event.",
  tags: ["live"],
  async test(t) {
    if (!process.env.COMPOSIO_EVAL_USER_ID) {
      t.skip(
        "Set COMPOSIO_EVAL_USER_ID to the Better Auth user id with Google Calendar connected."
      );
    }

    const first = await t.send(
      `Create a Google Calendar event titled "${CALENDAR_EVENT_TITLE}" on 2026-08-25 from 16:00 to 16:30 Europe/London. This message is my explicit confirmation to create that event now. Do not book a flight.`
    );

    if (first.inputRequests.length > 0) {
      await t.send(
        `Yes, I confirm. Create the Google Calendar event titled "${CALENDAR_EVENT_TITLE}" now.`
      );
    }

    t.succeeded();
    t.calledTool("COMPOSIO_MULTI_EXECUTE_TOOL", {
      input: (input) => {
        const payload = JSON.stringify(input);
        return (
          payload.includes("GOOGLECALENDAR_CREATE_EVENT") &&
          payload.includes(CALENDAR_EVENT_TITLE)
        );
      },
    });
    t.messageIncludes(CALENDAR_EVENT_TITLE);
    t.notCalledTool("booking-agent");
    t.notCalledTool("rebook-agent");
  },
  timeoutMs: 180_000,
});
