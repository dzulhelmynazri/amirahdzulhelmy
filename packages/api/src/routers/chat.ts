import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { followUpSuggestions } from "../lib/follow-ups";

const MAX_CONTEXT = 4000;

export const chatRouter = router({
  /**
   * Three things the traveller might want next, from the last exchange.
   *
   * A query rather than a mutation so it caches on the exchange it was made
   * for: the same pair of messages always yields the same pills, and going
   * back to an earlier conversation does not spend a model call redoing work.
   *
   * Never throws. `followUpSuggestions` returns an empty list on timeout,
   * refusal or malformed output, and no pills is a perfectly good outcome.
   */
  followUps: protectedProcedure
    .input(
      z.object({
        assistantMessage: z.string().max(MAX_CONTEXT),
        userMessage: z.string().max(MAX_CONTEXT),
      })
    )
    .query(({ input }) => followUpSuggestions(input)),
});
