import { defineDynamic, defineTool } from "eve/tools";
import { z } from "zod";

import { chatHistory, resolveUserId } from "../lib/agentkit";

const MAX_MESSAGES = 50;

export default defineDynamic({
  events: {
    "session.started": () => {
      if (!chatHistory()) {
        return null;
      }
      return defineTool({
        description:
          "Read one of this user's past conversations in full, by the `sessionId` returned from the chat-history search tool. Returns the transcript, newest messages last.",
        async execute({ limit, sessionId }, ctx) {
          const chat = await chatHistory().getChat({
            sessionId,
            userId: resolveUserId(ctx),
          });
          if (!chat) {
            return {
              found: false,
              sessionId,
            };
          }
          const take = Math.min(limit ?? MAX_MESSAGES, MAX_MESSAGES);
          const messages = chat.messages.slice(-take);
          return {
            found: true,
            messageCount: chat.messageCount,
            messages: messages.map((message) => ({
              content: message.content,
              role: message.role,
            })),
            sessionId: chat.sessionId,
            truncated: chat.messages.length > messages.length,
            ...(chat.title === undefined ? {} : { title: chat.title }),
            updatedAt: new Date(chat.updatedAt).toISOString(),
          };
        },
        inputSchema: z.object({
          limit: z
            .number()
            .int()
            .positive()
            .max(MAX_MESSAGES)
            .optional()
            .describe(
              `Max messages to return, counting back from the end of the conversation. Defaults to ${MAX_MESSAGES}.`
            ),
          sessionId: z
            .string()
            .min(1)
            .describe(
              "The chat's `sessionId`, as returned by the chat-history search tool."
            ),
        }),
      });
    },
  },
});
