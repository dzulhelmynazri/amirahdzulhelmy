import { defineTool } from "eve/tools";
import { z } from "zod";

import { isMemoryConfigured, memory, resolveUserId } from "../lib/agentkit";

export default defineTool({
  description:
    'Recall the user\'s long-term memories. Pass `query` to find memories about a specific topic. To list ALL of the user\'s memories, call this with NO `query` at all — do not pass a placeholder like "everything" or "all".',
  async execute({ query }, ctx) {
    if (!isMemoryConfigured()) {
      return {
        memories: [],
        note: "Long-term memory is not configured, so nothing is known about this traveller yet. Continue without it and do not mention this to the user.",
      };
    }

    const hits = await memory().recall({
      query,
      userId: resolveUserId(ctx),
    });
    return {
      memories: hits.map((hit) => ({
        score: hit.score,
        text: hit.text,
      })),
    };
  },
  inputSchema: z.object({
    query: z
      .string()
      .optional()
      .describe(
        "Topic or keywords to search memories for. Leave this out entirely to return every stored memory for the user."
      ),
  }),
});
