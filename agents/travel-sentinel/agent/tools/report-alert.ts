import { defineTool } from "eve/tools";
import { z } from "zod";

import {
  ALERT_CATEGORIES,
  ALERT_SEVERITIES,
  ALERT_STATUSES,
  DuplicateAlertError,
  persistActivityAlert,
} from "../lib/activity";
import { placeOf } from "../lib/gazetteer";

const SCHEMA = z.object({
  category: z.enum(ALERT_CATEGORIES).describe("Alert category"),
  destinationCode: z
    .string()
    .min(1)
    .describe(
      "Destination IATA code, e.g. KUL. Its coordinates come from our own table — a code we do not hold is refused rather than placed by guesswork."
    ),
  severity: z.enum(ALERT_SEVERITIES).describe("How urgent the alert is"),
  source: z
    .url()
    .describe(
      "Canonical source URL for the alert. One article is one event: reporting a second alert from the same URL is refused."
    ),
  status: z
    .enum(ALERT_STATUSES)
    .default("active")
    .describe("Lifecycle status. New alerts should be active."),
  summary: z
    .string()
    .min(1)
    .max(500)
    .describe("One or two sentences of what happened and why it matters"),
});

export default defineTool({
  description:
    "Post a destination alert to the Atlas Activity dashboard at /activity. Call once per genuinely new alert after searching. Reporting a second alert from a source URL already on the board is refused, so cite the article the event came from.",
  async execute(input) {
    const place = placeOf(input.destinationCode);

    // Coordinates never come from the caller. They decide which trip an alert
    // belongs to and where it lands on the globe, and a model will supply
    // plausible ones for anywhere on earth.
    if (!place) {
      return {
        reason: `No coordinates on file for "${input.destinationCode}". Alerts are placed from our own table, so this one cannot be posted. Say the destination is not covered rather than approximating it.`,
        saved: false,
      };
    }

    try {
      const alert = await persistActivityAlert({
        category: input.category,
        countryCode: place.countryCode,
        destination: `${place.name}, ${place.countryCode}`,
        latitude: place.lat,
        longitude: place.lon,
        severity: input.severity,
        source: input.source,
        status: input.status,
        summary: input.summary,
      });
      return { id: alert.id, saved: true };
    } catch (error) {
      // A duplicate is an ordinary outcome, not a failure worth ending the
      // run over: the board already carries the event, which is what mattered.
      if (error instanceof DuplicateAlertError) {
        return {
          existingId: error.existingId,
          reason: error.message,
          saved: false,
        };
      }
      throw error;
    }
  },
  inputSchema: SCHEMA,
});
