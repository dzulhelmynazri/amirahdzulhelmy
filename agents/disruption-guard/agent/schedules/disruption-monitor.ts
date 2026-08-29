import { defineSchedule } from "eve/schedules";

import resend from "../channels/resend";

/**
 * `routing-agent` is not one of this agent's subagents — only flight-guardian
 * and travel-sentinel are, because the Vercel Hobby function cap forced the
 * mesh down to three mounted agents. Asking for it by name meant the one
 * instruction that would put replacement options into a proactive alert could
 * never execute. flight-guardian is the hop that reaches routing-agent.
 */
const MONITOR_PROMPT =
  "Check for new flight incidents using webhook-incidents (most recent first). Before reporting, use search-chat-history to find incidents you already reported in previous runs — skip any order number you find there. For each genuinely new incident, summarize the order number, flight, and disruption, then call note-disruption-handled with its eventId and your summary so it reaches the traveller's Activity board, and use save-memory to record that you reported it. If the traveler should rebook, ask flight-guardian to have replacement alternatives ranked, passing the orderNo, route, passenger counts, and what changed, then include those alternatives in your report. Do not book, void, pay, or refund anything. If there are no new incidents, reply with nothing.";

export default defineSchedule({
  // Daily, because Vercel Hobby rejects anything more frequent and fails
  // the whole build over it. On Pro this can go back to "*/30 * * * *" —
  // thirty-minute disruption checks are the point of this schedule.
  cron: "0 22 * * *",
  run({ to, waitUntil, appAuth }) {
    const email = process.env.DISRUPTION_OPS_EMAIL;
    if (!email) {
      return;
    }

    waitUntil(to(resend, { email }).send(MONITOR_PROMPT, { auth: appAuth }));
  },
});
