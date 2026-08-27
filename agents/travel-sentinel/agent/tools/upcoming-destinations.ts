import { defineTool } from "eve/tools";
import { z } from "zod";

import { upcomingDestinations } from "../lib/destinations";

const DEFAULT_HORIZON_DAYS = 45;

/**
 * The list of places worth checking, computed rather than chosen.
 *
 * This exists because the model used to choose. `order-list` asks Atlas, Atlas
 * returns nothing for this account, and an agent handed an empty list picked
 * destinations that seemed plausible instead of stopping — which is how a
 * board belonging to someone flying Kuala Lumpur to Singapore filled up with
 * Seoul, Bali and Bangkok.
 *
 * An empty result here means there is nothing to watch. It does not mean
 * choose something.
 */
export default defineTool({
  description: `The destinations this account is actually flying to within the next ${DEFAULT_HORIZON_DAYS} days, from its own bookings. Use this to decide what to check. An empty list means there is nothing to watch — never substitute destinations of your own. Read-only.`,
  async execute(input) {
    const destinations = await upcomingDestinations(input.horizonDays);

    return {
      destinations,
      note:
        destinations.length === 0
          ? "No upcoming trips on file, so there is nothing to check. Report nothing and do not pick destinations yourself."
          : "Check exactly these and no others. Each code resolves through our own coordinate table.",
    };
  },
  inputSchema: z.object({
    horizonDays: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        `How far ahead to look. Defaults to ${DEFAULT_HORIZON_DAYS} days; beyond that a trip is not affected by this week.`
      ),
  }),
});
