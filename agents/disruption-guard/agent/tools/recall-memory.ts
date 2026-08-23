import { defineTool } from "eve/tools";
import { z } from "zod";

import { memory, resolveUserId } from "../lib/agentkit";

export default defineTool({
  description:
    'Recall the user\'s long-term memories. Pass `query` to find memories about a specific topic. To list ALL of the user\'s memories, call this with NO `query` at all — do not pass a placeholder like "everything" or "all".',
  async execute({ query }, ctx) {
    const hits = await memory().recall({
      query,
      userId: resolveUserId(ctx),
    });
    return hits.map((hit) => ({
      score: hit.score,
      text: hit.text,
    }));
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
