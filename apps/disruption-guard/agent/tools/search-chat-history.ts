import { defineDynamic, defineTool } from "eve/tools";
import { z } from "zod";

import { chatHistory, resolveUserId } from "../lib/agentkit";

export default defineDynamic({
  events: {
    "session.started": () => {
      if (!chatHistory()) {
        return null;
      }
      return defineTool({
        description:
          "Search this user's PAST conversations (previous sessions) by what was said, and return the matching chats — id, title, when it happened, message count — most relevant first. Use it when the user refers to an earlier conversation ('what did we decide about X?'). The current conversation is excluded; read a match in full with the chat-history read tool.",
        async execute({ limit, query, target }, ctx) {
          const hits = await chatHistory().searchChats({
            limit: limit ?? 10,
            query,
            userId: resolveUserId(ctx),
            ...(target === undefined ? {} : { target }),
          });
          const currentSessionId = ctx.session.id.replaceAll(":", "_");
          return hits
            .filter((hit) => hit.sessionId !== currentSessionId)
            .map((hit) => ({
              messageCount: hit.messageCount,
              score: hit.score,
              sessionId: hit.sessionId,
              ...(hit.title === undefined ? {} : { title: hit.title }),
              updatedAt: new Date(hit.updatedAt).toISOString(),
            }));
        },
        inputSchema: z.object({
          limit: z
            .number()
            .int()
            .positive()
            .max(50)
            .optional()
            .describe("Max chats to return. Defaults to 10."),
          query: z
            .string()
            .min(1)
            .describe(
              "Topic or keywords to look for in past conversations (typo-tolerant)."
            ),
          target: z
            .enum(["both", "model", "user"])
            .optional()
            .describe(
              "Which side of the conversation to match: what the user said, what you replied, or both (the default)."
            ),
        }),
      });
    },
  },
});
