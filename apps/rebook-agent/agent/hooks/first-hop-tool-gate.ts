import { defineHook } from "eve/hooks";

import { syncHopGateFromSession } from "../lib/first-hop-tools";

export default defineHook({
  events: {
    "session.started"(_event, ctx) {
      syncHopGateFromSession(ctx);
    },
    "turn.started"(_event, ctx) {
      syncHopGateFromSession(ctx);
    },
  },
});
