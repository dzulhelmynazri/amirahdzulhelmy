import { withEve } from "eve/next";
import type { EveNextConfig } from "eve/next";

const nextConfig: EveNextConfig = {
  cacheComponents: true,
  devIndicators: false,
  experimental: {
    optimizePackageImports: ["lucide-react"],
    /**
     * Chat history rides a server action, and a booking conversation's event
     * log broke the 1MB default mid-booking — the traveller saw a runtime
     * error for daring to have a long conversation. 4MB plus the event cap
     * in use-eve-chat keeps saves comfortably under the wire.
     */
    serverActions: {
      bodySizeLimit: "4mb",
    },
    turbopackRustReactCompiler: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: "api.dicebear.com",
        protocol: "https",
      },
      {
        hostname: "flagcdn.com",
        protocol: "https",
      },
    ],
  },
  partialPrefetching: true,
  reactCompiler: true,
  serverExternalPackages: [
    "@opentelemetry/api",
    "@opentelemetry/api-logs",
    "@opentelemetry/instrumentation",
    "@opentelemetry/sdk-logs",
    "@vercel/otel",
  ],
};

export default withEve(nextConfig, {
  agents: {
    "disruption-guard": "../../agents/disruption-guard",
    "flight-guardian": "../../agents/flight-guardian",
    "travel-sentinel": "../../agents/travel-sentinel",
  },
});
