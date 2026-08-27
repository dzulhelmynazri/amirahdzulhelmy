import { relations } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";

/**
 * One chat with an agent, kept so it survives the browser.
 *
 * The transcript used to live in a single `localStorage` key, which meant one
 * conversation at a time, gone on a cache clear and invisible on any other
 * device.
 *
 * `sessionId` is eve's durable session. eve keeps the authoritative history
 * and can replay it, so this table is a read model: enough to list past chats,
 * title them, and hand the client something to render immediately. Losing a
 * row loses the scrollback, never the agent's memory of the conversation.
 */
export const conversation = pgTable(
  "conversation",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: text("id").primaryKey(),
    /** Sorts the list; a chat is only as recent as its last message. */
    lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
    /**
     * The `{ events, session }` snapshot the chat client restores from. Shaped
     * by eve rather than by us, so it is stored opaquely and validated on read.
     */
    payload: jsonb("payload").$type<unknown>(),
    /** Set when the caller was not a signed-in user, e.g. a CLI run. */
    principalId: text("principal_id"),
    sessionId: text("session_id").notNull(),
    /** How far into eve's durable stream this snapshot reaches. */
    streamIndex: text("stream_index"),
    /** Taken from the opening message; the traveller never types one. */
    title: text("title").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      /* @__PURE__ */
      .$onUpdate(() => new Date())
      .notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("conversation_userId_idx").on(table.userId, table.lastMessageAt),
    index("conversation_sessionId_idx").on(table.sessionId),
  ]
);

export const conversationRelations = relations(conversation, ({ one }) => ({
  user: one(user, {
    fields: [conversation.userId],
    references: [user.id],
  }),
}));
