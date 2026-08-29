import { defineTool } from "eve/tools";
import { z } from "zod";

import { getAtlasClient } from "../lib/atlas";

export default defineTool({
  description:
    "Extract PNR (booking reference) details on the Atlas booking API for an existing booking. Pass the identifying fields exactly as documented by prior API responses. Read-only.",
  async execute(input) {
    const client = await getAtlasClient();
    return client.postBooking.extractPnr.extract(input);
  },
  inputSchema: z.looseObject({
    orderNo: z.string().optional().describe("Order number from a prior lookup"),
    pnr: z.string().optional().describe("PNR booking reference"),
  }),
});
