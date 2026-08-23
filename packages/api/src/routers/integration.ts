import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { getComposio } from "../lib/composio";

/** Toolkits the integrations page actually offers. Keep this closed. */
const toolkitSlugSchema = z.enum(["google_maps", "googlecalendar"]);

const isConnectedStatus = (status: string): boolean =>
  status === "ACTIVE" || status === "INITIATED";

export const integrationRouter = router({
  /**
   * Returns the Connect Link. tRPC cannot call Next's `redirect()`, so the
   * client navigates to this URL the same way a Server Action redirect would.
   */
  connect: protectedProcedure
    .input(z.object({ toolkitSlug: toolkitSlugSchema }))
    .mutation(async ({ ctx, input }) => {
      const composio = await getComposio();
      const composioSession = await composio.create(ctx.session.user.id);
      const connectionRequest = await composioSession.authorize(
        input.toolkitSlug,
        {
          callbackUrl: `${ctx.origin}/integrations`,
        }
      );

      if (!connectionRequest.redirectUrl) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate Composio connection URL",
        });
      }

      return { redirectUrl: connectionRequest.redirectUrl };
    }),

  connected: protectedProcedure.query(async ({ ctx }) => {
    const composio = await getComposio();
    const accounts = await composio.connectedAccounts.list({
      userIds: [ctx.session.user.id],
    });

    return accounts.items
      .filter((account) => isConnectedStatus(account.status))
      .map((account) => account.toolkit.slug);
  }),

  disconnect: protectedProcedure
    .input(z.object({ toolkitSlug: toolkitSlugSchema }))
    .mutation(async ({ ctx, input }) => {
      const composio = await getComposio();
      const accounts = await composio.connectedAccounts.list({
        userIds: [ctx.session.user.id],
      });

      const targetAccounts = accounts.items.filter(
        (account) =>
          account.toolkit.slug === input.toolkitSlug &&
          isConnectedStatus(account.status)
      );

      await Promise.all(
        targetAccounts.map((account) =>
          composio.connectedAccounts.delete(account.id)
        )
      );

      return { toolkitSlug: input.toolkitSlug };
    }),
});
