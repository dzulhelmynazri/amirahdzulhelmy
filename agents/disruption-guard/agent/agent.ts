import { defineAgent, defineDynamic } from "eve";

export default defineAgent({
  build: {
    externalDependencies: ["@upstash/redis"],
  },
  compaction: {
    thresholdPercent: 0.65,
  },
  limits: {
    maxInputTokensPerSession: 1_000_000,
    maxOutputTokensPerSession: 100_000,
    sessionTimeoutMs: 7 * 24 * 60 * 60 * 1000,
  },
  /**
   * Two model tiers, both env-switchable without a deploy.
   *
   * `ATLAS_AGENT_MODEL` is the conversation model; unset falls to qwen, so a
   * deploy that sets nothing behaves exactly as before. `ATLAS_TASK_MODEL`
   * covers background work — schedule runs and subagent hops — and defaults
   * to the conversation model, so setting neither changes nothing.
   *
   * Adapted from the sibling Atlas runtime. The point is the lever: when a
   * cheaper model proves good enough for schedule sweeps, moving them there
   * is an env edit, and nothing in the tools knows which model answered.
   *
   * Resolved once per session on purpose — switching mid-session re-ingests
   * the whole conversation at uncached prices.
   */
  model: defineDynamic({
    events: {
      "session.started": (_event, ctx) =>
        ctx.channel.kind === "schedule" || ctx.channel.kind === "subagent"
          ? (process.env.ATLAS_TASK_MODEL ??
            process.env.ATLAS_AGENT_MODEL ??
            "alibaba/qwen3.7-flash")
          : (process.env.ATLAS_AGENT_MODEL ?? "alibaba/qwen3.7-flash"),
    },
  }),
  reasoning: "low",
});
