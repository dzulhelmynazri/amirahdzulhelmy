import { defineTool } from "eve/tools";
import { z } from "zod";

import { getAtlasClient } from "../lib/atlas";

export default defineTool({
  description:
    "List flight incident events (schedule changes, cancellations, disruptions) from the Atlas booking API, paginated and filterable by order, PNR, passenger, airline, or time windows. Read-only.",
  async execute(input) {
    const client = await getAtlasClient();
    return client.webhook.incidents(input);
  },
  inputSchema: z.looseObject({
    airline: z.string().optional().describe("Filter by airline IATA code"),
    depTimeEnd: z
      .string()
      .optional()
      .describe("Filter by departure time upper bound"),
    depTimeStart: z
      .string()
      .optional()
      .describe("Filter by departure time lower bound"),
    eventId: z.string().optional().describe("Filter by event ID"),
    eventStatus: z
      .array(z.number())
      .optional()
      .describe("Filter by event status codes"),
    eventTimeEnd: z
      .string()
      .optional()
      .describe("Filter by event time upper bound"),
    eventTimeStart: z
      .string()
      .optional()
      .describe("Filter by event time lower bound"),
    eventType: z.string().optional().describe("Filter by event type"),
    orderNo: z.string().optional().describe("Filter by order number"),
    pageIndex: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("Page index, 0-based"),
    pageSize: z.number().int().min(1).default(20).describe("Page size"),
    paxEmail: z.string().optional().describe("Filter by passenger email"),
    paxName: z.string().optional().describe("Filter by passenger name"),
    pnr: z.string().optional().describe("Filter by PNR booking reference"),
    updateTimeStart: z
      .string()
      .optional()
      .describe("Filter by update time lower bound"),
  }),
});
