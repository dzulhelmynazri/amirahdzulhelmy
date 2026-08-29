import { defineAtlasRemoteAgent } from "../lib/remote-agent";

/**
 * The front door, standing in for the specialists that used to be mounted
 * here. routing-agent, rebook-agent, booking-agent and journey-concierge now
 * live inside flight-guardian as local subagents — Vercel Hobby caps a
 * deployment at 12 functions, and seven mounted agents blew through it — so
 * anything this agent used to hand them goes through the conductor instead.
 */
export default defineAtlasRemoteAgent("flight-guardian");
