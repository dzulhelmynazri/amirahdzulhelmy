import { defineSchedule } from "eve/schedules";

/**
 * The news sweep, scoped to trips this account actually has.
 *
 * It used to start from `order-list`, which asks Atlas. Atlas returns nothing
 * for this account, and an agent handed an empty list did not stop — it chose
 * destinations that seemed plausible. That is how a board belonging to someone
 * flying Kuala Lumpur to Singapore filled with Seoul, Bali and Bangkok.
 *
 * `upcoming-destinations` computes the list from our own bookings, so an empty
 * result is a fact rather than a prompt to improvise.
 */
export default defineSchedule({
  // Daily, because Vercel Hobby rejects anything more frequent and fails
  // the whole build over it. On Pro this can go back to "0 */6 * * *".
  cron: "0 21 * * *",
  markdown: `Check for new destination intelligence.

Call upcoming-destinations first. It returns the places this account is actually flying to, computed from its own bookings. Check those and no others.

If it returns an empty list, stop. Report nothing and reply with nothing. Do not choose destinations of your own, do not fall back to somewhere that seems likely, and do not check a city because it is in the news. A board of alerts for places the traveller is not going is worse than an empty board: it teaches them that nothing here is about them.

\`report-alert\` enforces this now: a destination nobody is flying to is refused, whatever the reason for reporting it. If you see that refusal, the destination did not belong on the list — do not retry it with a different code or a different framing.

For each destination, use list-activity-alerts and recall-memory to see what you have already reported, and skip those.

For the rest, run firecrawl__firecrawl_search restricted to the last 24 hours, and only accept a source that names itself: a wire service, a national meteorological or disaster agency, a government advisory, or a major newspaper. A blog, an aggregator and a social post are not sources. If the only thing you can find is one of those, report nothing for that destination.

Call report-alert once per genuinely new alert, with the destination IATA code, the source URL, and a summary of what was announced and by whom. One source URL is one event.

Use save-memory to record what you reported. If an alert may affect a specific booked flight, call disruption-guard with the orderNo, destination, and alert details.

Reply with nothing when there is nothing new.`,
});
