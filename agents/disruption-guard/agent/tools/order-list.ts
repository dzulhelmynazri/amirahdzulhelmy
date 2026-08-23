import { defineTool } from "eve/tools";
import { z } from "zod";

import { getAtlasClient } from "../lib/atlas";

export default defineTool({
  description:
    "List flight orders on the Atlas booking API, paginated. Use to look up a user's existing orders and find an orderNo. Read-only.",
  async execute(input) {
    const client = await getAtlasClient();
    return client.postBooking.orderList.list(input);
  },
  inputSchema: z.looseObject({
    pageIndex: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("Page index, 0-based"),
    pageSize: z.number().int().min(1).optional().describe("Page size"),
  }),
});
