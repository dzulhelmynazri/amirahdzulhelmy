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
    "booking-agent": "../booking-agent",
    "disruption-guard": "../disruption-guard",
    "flight-guardian": "../flight-guardian",
    "journey-concierge": "../journey-concierge",
    "rebook-agent": "../rebook-agent",
    "routing-agent": "../routing-agent",
    "travel-sentinel": "../travel-sentinel",
  },
});
