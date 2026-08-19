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
  model: "zai/glm-5.2",
  reasoning: "medium",
});
