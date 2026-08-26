import { defineTool } from "eve/tools";
import { z } from "zod";

import {
  ALERT_CATEGORIES,
  ALERT_SEVERITIES,
  ALERT_STATUSES,
  DuplicateAlertError,
  persistActivityAlert,
} from "../lib/activity";

const COUNTRY_CODE = /^[A-Za-z]{2}$/u;

const SCHEMA = z.object({
  category: z.enum(ALERT_CATEGORIES).describe("Alert category"),
  countryCode: z
    .string()
    .regex(COUNTRY_CODE, "Must be a 2-letter ISO country code.")
    .transform((value) => value.toUpperCase())
    .describe("ISO 3166-1 alpha-2 country code, e.g. JP"),
  destination: z
    .string()
    .min(1)
    .describe('City and country, e.g. "Osaka, Japan"'),
  latitude: z
    .number()
    .gte(-90)
    .lte(90)
    .describe("Approximate city latitude for the activity map"),
  longitude: z
    .number()
    .gte(-180)
    .lte(180)
    .describe("Approximate city longitude for the activity map"),
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
    try {
      const alert = await persistActivityAlert(input);
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
