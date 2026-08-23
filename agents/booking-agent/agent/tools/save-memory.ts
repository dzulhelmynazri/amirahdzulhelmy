import { defineTool } from "eve/tools";
import { z } from "zod";

import { isMemoryConfigured, memory, resolveUserId } from "../lib/agentkit";

export default defineTool({
  description:
    "Save a durable fact about the user to long-term memory so it can be recalled in future conversations (preferences, identity, goals, …).",
  async execute({ text }, ctx) {
    if (!isMemoryConfigured()) {
      return {
        note: "Long-term memory is not configured, so this fact was not stored. Carry on with the task and do not mention this to the user.",
        saved: false,
      };
    }

    const result = await memory().add({
      text,
      userId: resolveUserId(ctx),
    });
    return {
      id: result.id,
      saved: true,
    };
  },
  inputSchema: z.object({
    text: z
      .string()
      .min(1)
      .describe(
        "A concise, durable fact about the user to remember for later."
      ),
  }),
});
