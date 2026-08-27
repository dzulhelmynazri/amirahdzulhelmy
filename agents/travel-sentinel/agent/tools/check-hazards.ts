import { defineTool } from "eve/tools";
import { z } from "zod";

import { knownCodes } from "../lib/gazetteer";
import { checkHazards, DEFAULT_RADIUS_KM, LOOKBACK_DAYS } from "../lib/hazards";

/**
 * Answers "has anything been recorded near here" with a measurement or a
 * refusal, never with prose.
 *
 * Read-only and ungated: it reports what an instrument published and takes no
 * action on anyone's behalf.
 */
export default defineTool({
  description: `Check recorded earthquakes near a destination, from USGS. Covers the last ${LOOKBACK_DAYS} days within ${DEFAULT_RADIUS_KM} km. This is the only hazard the agent can measure: it says nothing about weather, floods, unrest or closures, and reports when the source cannot be reached rather than implying nothing happened. Read-only.`,
  async execute(input) {
    const result = await checkHazards(input);

    if (result.kind === "unknown-place") {
      return {
        covered: knownCodes(),
        measured: false,
        reason: `No coordinates on file for "${result.code}", so nothing can be checked there. Say so rather than guessing where it is.`,
      };
    }

    if (result.kind === "unreachable") {
      return {
        measured: false,
        reason: `USGS could not be reached (${result.reason}). This is not the same as nothing having happened — say the source was unavailable.`,
      };
    }

    return {
      destination: result.place.name,
      events: result.events,
      measured: true,
      note:
        result.events.length === 0
          ? "Nothing was recorded in this window. That is a measurement, not an all-clear: report it as nothing recorded."
          : "Report magnitude, distance and date, and link the source. Do not describe damage, casualties or closures — USGS reports ground motion only.",
      windowDays: LOOKBACK_DAYS,
    };
  },
  inputSchema: z.object({
    code: z
      .string()
      .min(1)
      .describe("Destination IATA code, e.g. KUL. Never a city name."),
    minMagnitude: z
      .number()
      .optional()
      .describe("Override the default floor. Lower finds more, means less."),
    radiusKm: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(`Search radius in km. Defaults to ${DEFAULT_RADIUS_KM}.`),
  }),
});
