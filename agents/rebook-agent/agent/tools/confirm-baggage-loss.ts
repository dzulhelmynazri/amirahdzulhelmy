import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";

import { getAtlasClient } from "../lib/atlas";
import { persistBooking } from "../lib/bookings";

export default defineTool({
  approval: always(),
  description:
    "Accept a baggage price change on an Atlas order that is waiting for one. The airline has repriced baggage since the order was created, and the order will not proceed until someone agrees to the new amount. Show the traveller the new price and get an explicit yes before calling: this commits them to paying it.",
  async execute(input, context) {
    const client = await getAtlasClient();
    const result = await client.postBooking.confirmBaggageLoss.confirm(input);
    await persistBooking(
      context,
      "baggage_price_confirmed",
      result,
      input.orderNo
    );
    return result;
  },
  inputSchema: z.looseObject({
    orderNo: z
      .string()
      .describe(
        "Atlas main order number waiting for baggage price confirmation"
      ),
  }),
});
