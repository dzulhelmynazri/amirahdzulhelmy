import { defineSchedule } from "eve/schedules";

import { LOOKBACK_DAYS, WORTH_REPORTING } from "../lib/hazards";

/**
 * The daily instrumental sweep.
 *
 * Daily is deliberate and must stay daily. This repo deploys to Vercel, where
 * Hobby accounts reject any cron that would run more than once a day and fail
 * the build outright. `0 23 * * *` is 07:00 in Malaysia, which is where the
 * people reading it are.
 *
 * The bar for speaking unprompted is higher than the bar for answering a
 * question, and an empty daily message trains people to ignore the channel —
 * so silence is the correct output most days.
 */
export default defineSchedule({
  cron: "0 23 * * *",
  markdown: `Check recorded earthquakes near upcoming trips.

Call upcoming-destinations to get the places this account is flying to. For each one, call check-hazards once with its IATA code. If the list is empty, stop and reply with nothing — never substitute a destination of your own.

Only report an event of magnitude ${WORTH_REPORTING} or above. Below that it is not worth opening a conversation nobody asked for, even though it is worth answering if someone asks.

For each event worth reporting, call report-alert with category "safety", the destination code, the USGS event URL as the source, and a summary that states magnitude, distance and date. Report the measurement only: USGS records ground motion, not what fell down, so never mention damage, casualties or closures, and never say whether anyone should travel.

If check-hazards says the place is unknown, skip it silently — a missing coordinate is a gap in our table, not news.

If check-hazards says USGS was unreachable, say so plainly in your reply. Do not let an unreachable source read as nothing having happened.

Reply with nothing at all when there is nothing to say, and that includes having nothing to check. No upcoming trips, no destinations we hold coordinates for, and no event above ${WORTH_REPORTING} are all silence — not an explanation of why you were quiet. A daily message saying you found nothing teaches people to stop reading this channel, and then the one day it matters they will not see it.

Do not search the web in this schedule. The last ${LOOKBACK_DAYS} days of USGS is the whole of what you can measure here.`,
});
