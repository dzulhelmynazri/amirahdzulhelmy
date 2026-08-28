import { defineAgent } from "eve";

export default defineAgent({
  compaction: {
    thresholdPercent: 0.75,
  },
  limits: {
    maxInputTokensPerSession: 2_000_000,
    maxOutputTokensPerSession: 200_000,
    sessionTimeoutMs: 7 * 24 * 60 * 60 * 1000,
  },
  /**
   * Qwen everywhere unless something says otherwise.
   *
   * The default is what staging and production run, so a deploy that sets
   * nothing behaves exactly as before. `ATLAS_AGENT_MODEL` is for local work,
   * where a cheaper model is worth more than matching production — it lives in
   * `.env.local`, which is gitignored, so it cannot follow the code out.
   *
   * Read at module load, which means changing it needs a restart, not a
   * redeploy.
   */
  model: process.env.ATLAS_AGENT_MODEL ?? "alibaba/qwen3.7-flash",
  reasoning: "low",
});
