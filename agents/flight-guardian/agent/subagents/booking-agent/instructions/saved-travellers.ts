import { defineDynamic, defineInstructions } from "eve/instructions";

/**
 * The saved travellers, injected at session start.
 *
 * `list-travellers` exists and the instructions order it called before asking
 * for passenger details — and a measured booking run asked for "full name as
 * on ID/passport, passport number" anyway, with two travellers on file. A
 * rule the model can skip is a rule that gets skipped, so the names go into
 * context where there is nothing to skip.
 *
 * Names only. Passport numbers and birthdays stay behind the tool: the model
 * needs to know who exists to offer them, and nothing about offering needs a
 * document number in every prompt of every session.
 */
export default defineDynamic({
  events: {
    "session.started": async (_event, ctx) => {
      // Same ownership rule as lib/travellers.ts, restated here because the
      // resolver context is not a ToolContext: a verified better-auth user,
      // or the hand-set dev id, or nobody.
      const auth = ctx.session.auth.current ?? ctx.session.auth.initiator;
      const isUser = auth?.authenticator.toLowerCase().includes("better");
      const userId = isUser ? auth?.principalId : process.env.ATLAS_DEV_USER_ID;

      if (!userId) {
        return null;
      }

      const { db } = await import("@atlas/db");
      const { traveller } = await import("@atlas/db/schema/travellers");
      const { desc, eq } = await import("drizzle-orm");

      const rows = await db
        .select({ isPrimary: traveller.isPrimary, name: traveller.name })
        .from(traveller)
        .where(eq(traveller.userId, userId))
        .orderBy(desc(traveller.isPrimary), desc(traveller.createdAt));

      if (rows.length === 0) {
        return null;
      }

      const names = rows
        .map((row) => `${row.name}${row.isPrimary ? " (default)" : ""}`)
        .join("; ");

      return defineInstructions({
        content: `# Saved travellers

This account has saved traveller profiles: ${names}.

When passenger details are needed, offer these by name first — never open by asking for a name or passport number this account already holds. Fetch the full details with \`list-travellers\` once one is chosen. If the booking is for someone else, they can say so.`,
      });
    },
  },
});
