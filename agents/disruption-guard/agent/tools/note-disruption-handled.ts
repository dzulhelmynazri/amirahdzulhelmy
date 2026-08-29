import { defineTool } from "eve/tools";
import { z } from "zod";

import { noteDisruptionHandled } from "../lib/disruptions";

export default defineTool({
  description:
    "Attach your finding to a disruption already recorded from an Atlas push, and mark it reviewed so it shows on the traveller's Activity board. Call once per event, after query-order tells you what actually changed. Report what this returns rather than what you asked it to do.",
  async execute(input) {
    const saved = await noteDisruptionHandled(input.eventId, input.note);

    return saved
      ? { saved: true }
      : {
          reason: `No disruption is on file with eventId "${input.eventId}". Do not invent one — say the event could not be matched.`,
          saved: false,
        };
  },
  inputSchema: z.object({
    eventId: z
      .string()
      .min(1)
      .describe("Atlas event id, exactly as it arrived in the push"),
    note: z
      .string()
      .min(1)
      .max(2000)
      .describe(
        "One or two plain sentences: what changed, and what the traveller should do about it"
      ),
  }),
});
