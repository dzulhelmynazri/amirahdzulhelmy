import { protectedProcedure, router } from "../index";
import { trendingDisruptionNews } from "../lib/news";

export const newsRouter = router({
  /**
   * World disruption headlines, from named outlets in the last 24 hours.
   *
   * Distinct from `activity.list` on purpose: that board carries alerts about
   * trips this account has, and folding world news into it would cost every
   * row on it the meaning that makes it worth reading.
   */
  trending: protectedProcedure.query(async () => {
    try {
      return { items: await trendingDisruptionNews(), reachable: true };
    } catch {
      // A failed fetch is not evidence that nothing is happening, so it is
      // reported as unreachable rather than as an empty feed.
      return { items: [], reachable: false };
    }
  }),
});
