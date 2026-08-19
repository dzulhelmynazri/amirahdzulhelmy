import { defineAgent } from "eve";

export default defineAgent({
  compaction: {
    thresholdPercent: 0.65,
  },
  limits: {
    maxInputTokensPerSession: 1_000_000,
    maxOutputTokensPerSession: 100_000,
    sessionTimeoutMs: 7 * 24 * 60 * 60 * 1000,
  },
  model: "zai/glm-5.2",
  reasoning: "low",
});
