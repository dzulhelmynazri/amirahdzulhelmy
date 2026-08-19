import { defineSchedule } from "eve/schedules";

import resend from "../channels/resend";

const MONITOR_PROMPT =
  "Check for new flight incidents using webhook-incidents (most recent first). Report only incidents not already reported earlier in this conversation. For each new incident, summarize the order number, flight, and disruption. If the traveler should rebook, call routing-agent with the orderNo, route, passenger counts, and what changed so it can rank read-only replacement alternatives, then include those alternatives in your report. Do not call rebook-agent, and do not book, void, or refund anything. If there are no new incidents, reply with nothing.";

export default defineSchedule({
  cron: "*/30 * * * *",
  run({ to, waitUntil, appAuth }) {
    const email = process.env.DISRUPTION_OPS_EMAIL;
    if (!email) {
      return;
    }

    waitUntil(to(resend, { email }).send(MONITOR_PROMPT, { auth: appAuth }));
  },
});
