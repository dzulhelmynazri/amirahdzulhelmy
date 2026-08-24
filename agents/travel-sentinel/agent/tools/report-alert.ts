import { defineTool } from "eve/tools";
import { z } from "zod";

import {
  ALERT_CATEGORIES,
  ALERT_SEVERITIES,
  ALERT_STATUSES,
  persistActivityAlert,
} from "../lib/activity";

const COUNTRY_CODE = /^[A-Za-z]{2}$/u;

export default defineTool({
  description:
    "Post a destination alert to the Atlas Activity dashboard at /activity. Call once per genuinely new alert after searching. Do not use this for already-reported alerts — check list-activity-alerts and recall-memory first.",
  async execute(input) {
    const alert = await persistActivityAlert({
      category: input.category,
      countryCode: input.countryCode,
      destination: input.destination,
      latitude: input.latitude,
      longitude: input.longitude,
      severity: input.severity,
      source: input.source,
      status: input.status,
      summary: input.summary,
    });
    return {
      id: alert.id,
      saved: true,
    };
  },
  inputSchema: z.object({
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
      .describe("Canonical source URL for the alert, cited on the dashboard"),
    status: z
      .enum(ALERT_STATUSES)
      .default("active")
      .describe("Lifecycle status. New alerts should be active."),
    summary: z
      .string()
      .min(1)
      .max(500)
      .describe("One or two sentences of what happened and why it matters"),
  }),
});
