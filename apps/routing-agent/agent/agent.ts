import { defineAgent } from "eve";

export default defineAgent({
  compaction: {
    thresholdPercent: 0.7,
  },
  limits: {
    maxInputTokensPerSession: 500_000,
    maxOutputTokensPerSession: 50_000,
    sessionTimeoutMs: 24 * 60 * 60 * 1000,
  },
  model: "alibaba/qwen3.7-flash",
  reasoning: "low",
});
