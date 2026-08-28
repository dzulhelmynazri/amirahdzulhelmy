import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";

import { getAtlasClient } from "../lib/atlas";
import { persistBooking } from "../lib/bookings";

export default defineTool({
  approval: always(),
  description:
    "Claim a PNR on the Atlas booking API, attaching an airline reference to an order. Use when a booking exists at the airline but Atlas does not hold it — a ticket bought elsewhere, or an order whose reference was lost mid-flow. Distinct from extract-pnr, which only reads a reference out of text and changes nothing. Confirm the PNR belongs to this traveller before claiming it.",
  async execute(input, context) {
    const client = await getAtlasClient();
    const result = await client.postBooking.pnrClaim.claim(input);
    await persistBooking(context, "pnr_claimed", result, input.orderNo);
    return result;
  },
  inputSchema: z.looseObject({
    orderNo: z
      .string()
      .optional()
      .describe("Order number the PNR is attached to, when one exists"),
    pnr: z
      .string()
      .describe(
        "Airline PNR, exactly as issued. Never reformat or correct it."
      ),
  }),
});
