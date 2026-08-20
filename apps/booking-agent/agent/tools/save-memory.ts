import { defineTool } from "eve/tools";
import { z } from "zod";

import { memory, resolveUserId } from "../lib/agentkit";

export default defineTool({
  description:
    "Save a durable fact about the user to long-term memory so it can be recalled in future conversations (preferences, identity, goals, …).",
  async execute({ text }, ctx) {
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
