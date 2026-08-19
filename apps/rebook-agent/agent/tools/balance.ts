import { defineTool } from "eve/tools";
import { z } from "zod";

import { getAtlasClient } from "../lib/atlas";

export default defineTool({
  description:
    "Check the Atlas booking API account balance. Use before expensive bookings or when a payment could not be confirmed, since a low balance can block ticketing. Read-only.",
  async execute(input) {
    const client = await getAtlasClient();
    return client.utility.balance.get(input);
  },
  inputSchema: z.looseObject({}),
});
