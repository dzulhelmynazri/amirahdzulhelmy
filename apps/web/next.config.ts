import { withEve } from "eve/next";
import type { EveNextConfig } from "eve/next";

const nextConfig: EveNextConfig = {
  cacheComponents: true,
  devIndicators: false,
  experimental: {
    optimizePackageImports: ["lucide-react"],
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
    "booking-agent": "../../agents/booking-agent",
    "disruption-guard": "../../agents/disruption-guard",
    "flight-guardian": "../../agents/flight-guardian",
    "journey-concierge": "../../agents/journey-concierge",
    "rebook-agent": "../../agents/rebook-agent",
    "routing-agent": "../../agents/routing-agent",
    "travel-sentinel": "../../agents/travel-sentinel",
  },
});
