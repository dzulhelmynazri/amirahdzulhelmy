import { defineHook } from "eve/hooks";

import { appendChatMessage } from "../lib/agentkit";

export default defineHook({
  events: {
    async "message.completed"(event, ctx) {
      try {
        await appendChatMessage(ctx, "assistant", event.data.message ?? "");
      } catch (error) {
        console.warn(
          "[agentkit] chat-history capture failed (assistant message):",
          error
        );
      }
    },
    async "message.received"(event, ctx) {
      try {
        await appendChatMessage(ctx, "user", event.data.message);
      } catch (error) {
        console.warn(
          "[agentkit] chat-history capture failed (user message):",
          error
        );
      }
    },
  },
});
