import { defineDynamic, defineInstructions } from "eve/instructions";

/**
 * The signed-in account, injected at session start.
 *
 * A measured run asked "how would you like me to identify your account —
 * booking email, PNR, or order number?" to a traveller who was already
 * signed in. The panel authenticates every session; making a known user
 * prove who they are is the fastest way to make the product feel broken.
 * So the account's name and email go into context, where there is nothing
 * to ask.
 */
export default defineDynamic({
  events: {
    "session.started": async (_event, ctx) => {
      // Same ownership rule as the traveller helpers: a verified better-auth
      // user, or the hand-set dev id, or nobody.
      const auth = ctx.session.auth.current ?? ctx.session.auth.initiator;
      const isUser = auth?.authenticator.toLowerCase().includes("better");
      const userId = isUser ? auth?.principalId : process.env.ATLAS_DEV_USER_ID;

      if (!userId) {
        return null;
      }

      const { db } = await import("@atlas/db");
      const { user } = await import("@atlas/db/schema/auth");
      const { eq } = await import("drizzle-orm");

      const rows = await db
        .select({ email: user.email, name: user.name })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

      const [account] = rows;
      if (!account) {
        return null;
      }

      return defineInstructions({
        content: `# Signed-in account

You are talking to ${account.name} (${account.email}), already authenticated. Their bookings, trips, and activity are scoped to this account automatically — never ask them to identify themselves with an email, PNR, or order number before looking something up. Ask for a PNR or order number only to disambiguate between several of their own bookings.`,
      });
    },
  },
});
