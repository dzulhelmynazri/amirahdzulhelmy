import { defineDynamic, defineTool } from "eve/tools";
import { z } from "zod";

import { getAtlasClient } from "../lib/atlas";
import { persistBooking } from "../lib/bookings";
import { shouldOmitExtraSearchTools } from "../lib/first-hop-tools";

export default defineDynamic({
  events: {
    "turn.started": (_event, ctx) => {
      if (shouldOmitExtraSearchTools(ctx)) {
        return null;
      }

      return defineTool({
        description:
          "Query the current status of a flight order on the Atlas booking API, including payment and ticketing progress. Use this for all follow-up checks after an order or payment; do not describe pending ticketing as failure. Read-only.",
        async execute(input, context) {
          const client = await getAtlasClient();
          const result = await client.flights.queryOrder.query(input);

          // Only call that returns the full order — passengers, routing,
          // airline PNRs. Status is left alone: this is a read.
          await persistBooking(context, null, result, input.orderNo, {
            enrichOnly: true,
          });

          return result;
        },
        inputSchema: z.object({
          orderNo: z
            .string()
            .describe("Order number, exactly as returned by create-order"),
        }),
      });
    },
  },
});
