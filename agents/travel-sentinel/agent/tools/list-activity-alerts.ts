import { defineTool } from "eve/tools";
import { z } from "zod";

import { listActivityAlerts } from "../lib/activity";

export default defineTool({
  description:
    "List destination alerts already posted to the Atlas Activity dashboard. Use before reporting so you do not duplicate an alert that is already on /activity.",
  async execute(input) {
    const alerts = await listActivityAlerts(input);
    return alerts.map((alert) => ({
      category: alert.category,
      destination: alert.destination,
      detectedAt: alert.detectedAt.toISOString(),
      id: alert.id,
      severity: alert.severity,
      source: alert.source,
      status: alert.status,
      summary: alert.summary,
    }));
  },
  inputSchema: z.object({
    destination: z
      .string()
      .min(1)
      .optional()
      .describe("If set, only alerts for this destination"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe("Maximum alerts to return. Defaults to 50."),
  }),
});
