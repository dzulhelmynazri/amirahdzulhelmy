import { defineSchedule } from "eve/schedules";

import resend from "../channels/resend";

const MONITOR_PROMPT =
  "Check for new destination intelligence. Use order-list to find upcoming trips, then for each destination use recall-memory to see what alerts you already reported — skip any you find there. For destinations with no prior alerts, run firecrawl__firecrawl_search with targeted queries for travel advisories, safety alerts, weather warnings, and transit disruptions. If you find genuinely new alerts, summarize them grouped by category (safety, weather, transit, political, health) with source URLs, then use save-memory to record what you reported. If an alert may affect a specific booked flight, call disruption-guard with the orderNo, destination, and alert details. If there are no new alerts for any destination, reply with nothing.";

export default defineSchedule({
  cron: "0 */6 * * *",
  run({ to, waitUntil, appAuth }) {
    const email = process.env.DISRUPTION_OPS_EMAIL;
    if (!email) {
      return;
    }

    waitUntil(to(resend, { email }).send(MONITOR_PROMPT, { auth: appAuth }));
  },
});
