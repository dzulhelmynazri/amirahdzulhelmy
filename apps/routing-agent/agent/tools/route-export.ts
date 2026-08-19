import { defineTool } from "eve/tools";
import { z } from "zod";

import { getAtlasClient } from "../lib/atlas";

export default defineTool({
  description:
    "Export supported flight routes from the Atlas booking API. Use to check whether a route is bookable, discover alternate airports, or validate connection options before searching fares. Read-only.",
  async execute(input) {
    const client = await getAtlasClient();
    return client.utility.routeExport.export(input);
  },
  inputSchema: z.looseObject({}),
});
